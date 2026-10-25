package com.sekrteery.app;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** يقرأ ويحدّث المواعيد من Firestore مباشرة (في الخلفية، بدون ما يكون التطبيق مفتوح). */
final class CloudSync {
    private static String idToken;
    private static long idTokenExp;

    private CloudSync() {}

    private static String http(String method, String url, String contentType, String body, String bearer) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        if ("PATCH".equals(method)) {
            c.setRequestMethod("POST");
            c.setRequestProperty("X-HTTP-Method-Override", "PATCH");
        } else {
            c.setRequestMethod(method);
        }
        if (bearer != null) c.setRequestProperty("Authorization", "Bearer " + bearer);
        if (body != null) {
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", contentType);
            try (OutputStream os = c.getOutputStream()) { os.write(body.getBytes(StandardCharsets.UTF_8)); }
        }
        int code = c.getResponseCode();
        InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        if (is != null) {
            byte[] buf = new byte[8192]; int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            is.close();
        }
        String res = bo.toString("UTF-8");
        if (code >= 400) throw new Exception("HTTP " + code + ": " + res);
        return res;
    }

    private static synchronized String token(Context ctx, JSONObject cr) throws Exception {
        if (idToken != null && System.currentTimeMillis() < idTokenExp - 60_000L) return idToken;
        String body = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(cr.getString("refreshToken"), "UTF-8");
        String res = http("POST", "https://securetoken.googleapis.com/v1/token?key=" + cr.getString("apiKey"),
                "application/x-www-form-urlencoded", body, null);
        JSONObject o = new JSONObject(res);
        idToken = o.getString("id_token");
        idTokenExp = System.currentTimeMillis() + o.optLong("expires_in", 3600) * 1000L;
        String newRefresh = o.optString("refresh_token", null);
        if (newRefresh != null && !newRefresh.equals(cr.getString("refreshToken"))) {
            cr.put("refreshToken", newRefresh);
            AlarmStore.setCreds(ctx, cr.toString());
        }
        return idToken;
    }

    private static String base(JSONObject cr) throws Exception {
        return "https://firestore.googleapis.com/v1/projects/" + cr.getString("projectId")
                + "/databases/(default)/documents/users/" + cr.getString("uid");
    }

    /** يسحب كل العناصر غير المنجزة ويرجّع قائمة التنبيهات. */
    static JSONArray pull(Context ctx) throws Exception {
        JSONObject cr = AlarmStore.creds(ctx);
        if (cr == null) return null;
        String tk = token(ctx, cr);
        String q = "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"items\"}],"
                + "\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"done\"},\"op\":\"EQUAL\",\"value\":{\"booleanValue\":false}}}}}";
        String res = http("POST", base(cr) + ":runQuery", "application/json", q, tk);
        JSONArray rows = new JSONArray(res);
        JSONArray out = new JSONArray();
        long now = System.currentTimeMillis();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject doc = rows.optJSONObject(i) != null ? rows.getJSONObject(i).optJSONObject("document") : null;
            if (doc == null) continue;
            JSONObject f = doc.optJSONObject("fields");
            if (f == null) continue;
            if (bool(f, "deleted")) continue;
            String nat = str(f, "nat");
            if (nat == null || nat.isEmpty()) continue;
            try {
                JSONArray al = new JSONArray(nat);
                for (int k = 0; k < al.length(); k++) {
                    JSONObject a = al.getJSONObject(k);
                    if (a.optLong("at") > now - 60_000L) out.put(a);
                }
            } catch (Exception ignored) {}
        }
        return out;
    }

    private static boolean bool(JSONObject f, String k) {
        JSONObject v = f.optJSONObject(k);
        return v != null && v.optBoolean("booleanValue", false);
    }

    private static String str(JSONObject f, String k) {
        JSONObject v = f.optJSONObject(k);
        return v != null ? v.optString("stringValue", null) : null;
    }

    private static JSONObject intVal(long v) throws Exception { return new JSONObject().put("integerValue", String.valueOf(v)); }

    /** يحدّث العنصر في السحابة بعد "تم" أو "أجّل" من شاشة المنبه. */
    static void patchAsync(Context ctx, String id, boolean done, long snoozeUntil, long now) {
        final Context app = ctx.getApplicationContext();
        if (AlarmStore.creds(app) == null) return;
        new Thread(() -> {
            try {
                JSONObject cr = AlarmStore.creds(app);
                if (cr == null) return;
                String tk = token(app, cr);
                JSONObject fields = new JSONObject();
                StringBuilder mask = new StringBuilder();
                fields.put("updatedAt", intVal(now)); mask.append("updateMask.fieldPaths=updatedAt");
                if (done) {
                    fields.put("done", new JSONObject().put("booleanValue", true));
                    fields.put("doneAt", intVal(now));
                    fields.put("snoozeUntil", intVal(0));
                    fields.put("nat", new JSONObject().put("stringValue", "[]"));
                    mask.append("&updateMask.fieldPaths=done&updateMask.fieldPaths=doneAt&updateMask.fieldPaths=snoozeUntil&updateMask.fieldPaths=nat");
                } else {
                    fields.put("snoozeUntil", intVal(snoozeUntil));
                    mask.append("&updateMask.fieldPaths=snoozeUntil");
                    // نحدّث قائمة التنبيهات المحفوظة عشان باقي الأجهزة تعرف بالتأجيل
                    JSONObject f = AlarmStore.follow(app).optJSONObject(id + ":s");
                    if (f != null) {
                        JSONArray one = new JSONArray().put(f);
                        fields.put("nat", new JSONObject().put("stringValue", one.toString()));
                        mask.append("&updateMask.fieldPaths=nat");
                    }
                }
                JSONObject body = new JSONObject().put("fields", fields);
                http("PATCH", base(cr) + "/items/" + URLEncoder.encode(id, "UTF-8") + "?" + mask + "&currentDocument.exists=true",
                        "application/json", body.toString(), tk);
            } catch (Exception ignored) {
                // لو ما فيه نت: الواجهة بتحدّثها لما تفتح التطبيق
            }
        }).start();
    }
}
