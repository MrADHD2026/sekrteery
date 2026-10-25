package com.sekrteery.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.HandlerThread;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/** يحسب وقت الطريق من موقع الجوال للموعد، ويجدول تنبيه "اطلع الحين". */
final class Travel {
    private Travel() {}

    static SharedPreferences prefs(Context c) { return AlarmStore.prefs(c); }

    static String mapsKey(Context c) {
        try { return new JSONObject(prefs(c).getString("config", "{}")).optString("mapsKey", ""); } catch (Exception e) { return ""; }
    }

    static boolean hasLocationPerm(Context c) {
        return c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    /** موقع الجوال الحالي (يوقف الخيط لين يجي أو ينتهي الوقت). */
    static Location location(Context c, long timeoutMs) {
        if (!hasLocationPerm(c)) return null;
        LocationManager lm = c.getSystemService(LocationManager.class);
        if (lm == null) return null;
        Location best = null;
        try {
            for (String p : lm.getProviders(true)) {
                Location l = lm.getLastKnownLocation(p);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            }
        } catch (SecurityException ignored) {}
        if (best != null && System.currentTimeMillis() - best.getTime() < 3 * 60_000L) return best;

        String provider = null;
        try {
            if (Build.VERSION.SDK_INT >= 31 && lm.isProviderEnabled(LocationManager.FUSED_PROVIDER)) provider = LocationManager.FUSED_PROVIDER;
            else if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) provider = LocationManager.NETWORK_PROVIDER;
            else if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) provider = LocationManager.GPS_PROVIDER;
        } catch (Exception ignored) {}
        if (provider == null) return best;

        final Location[] out = {null};
        final CountDownLatch latch = new CountDownLatch(1);
        HandlerThread ht = null;
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                lm.getCurrentLocation(provider, null, Executors.newSingleThreadExecutor(), l -> { out[0] = l; latch.countDown(); });
            } else {
                ht = new HandlerThread("sk-loc");
                ht.start();
                lm.requestSingleUpdate(provider, new LocationListener() {
                    @Override public void onLocationChanged(Location l) { out[0] = l; latch.countDown(); }
                    @Override public void onProviderEnabled(String p) {}
                    @Override public void onProviderDisabled(String p) {}
                    @Override public void onStatusChanged(String p, int s, android.os.Bundle b) {}
                }, ht.getLooper());
            }
            latch.await(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (Exception ignored) {
        } finally {
            if (ht != null) ht.quitSafely();
        }
        return out[0] != null ? out[0] : best;
    }

    private static String http(String method, String url, String body, String[][] headers) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(10000);
        c.setRequestMethod(method);
        c.setRequestProperty("User-Agent", "Sekrteery/1.0 (personal reminder app)");
        if (headers != null) for (String[] h : headers) c.setRequestProperty(h[0], h[1]);
        if (body != null) {
            c.setDoOutput(true);
            try (OutputStream os = c.getOutputStream()) { os.write(body.getBytes(StandardCharsets.UTF_8)); }
        }
        int code = c.getResponseCode();
        InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        if (is != null) { byte[] b = new byte[8192]; int n; while ((n = is.read(b)) > 0) bo.write(b, 0, n); is.close(); }
        String s = bo.toString("UTF-8");
        if (code >= 400) throw new Exception("HTTP " + code + " " + s);
        return s;
    }

    /** يرجّع {الدقائق، المسافة بالمتر، 1=جوجل/0=تقديري}. */
    static long[] route(Context c, double fLat, double fLng, double tLat, double tLng) throws Exception {
        String key = mapsKey(c);
        if (!key.isEmpty()) {
            try {
                JSONObject body = new JSONObject()
                        .put("origin", new JSONObject().put("location", new JSONObject().put("latLng", new JSONObject().put("latitude", fLat).put("longitude", fLng))))
                        .put("destination", new JSONObject().put("location", new JSONObject().put("latLng", new JSONObject().put("latitude", tLat).put("longitude", tLng))))
                        .put("travelMode", "DRIVE").put("routingPreference", "TRAFFIC_AWARE");
                String res = http("POST", "https://routes.googleapis.com/directions/v2:computeRoutes", body.toString(), new String[][]{
                        {"Content-Type", "application/json"}, {"X-Goog-Api-Key", key}, {"X-Goog-FieldMask", "routes.duration,routes.distanceMeters"}});
                JSONObject r = new JSONObject(res).getJSONArray("routes").getJSONObject(0);
                long secs = Long.parseLong(r.getString("duration").replace("s", ""));
                return new long[]{(secs + 59) / 60, r.optLong("distanceMeters"), 1};
            } catch (Exception ignored) { /* نجرب المجاني */ }
        }
        String res = http("GET", String.format(Locale.US, "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=false", fLng, fLat, tLng, tLat), null, null);
        JSONArray routes = new JSONObject(res).getJSONArray("routes");
        JSONObject r = routes.getJSONObject(0);
        double secs = r.getDouble("duration") * 1.3; // ما فيه زحمة مباشرة: نضيف ٣٠٪
        return new long[]{(long) Math.ceil(secs / 60.0), (long) r.optDouble("distance"), 0};
    }

    /** لما يجي وقت الفحص: نحسب متى لازم تطلع. */
    static void check(Context c, JSONObject a) {
        String id = a.optString("id");
        long due = a.optLong("due");
        long now = System.currentTimeMillis();
        if (due <= now) return;
        prefs(c).edit().putLong("trvfired_" + id, due).apply();
        long bufferMs = a.optInt("buffer", 15) * 60_000L;

        long minutes = -1; boolean google = false; boolean located = false;
        Location l = location(c, 15_000L);
        if (l != null) {
            located = true;
            try {
                long[] r = route(c, l.getLatitude(), l.getLongitude(), a.optDouble("lat"), a.optDouble("lng"));
                minutes = r[0]; google = r[2] == 1;
                prefs(c).edit().putLong("trvmin_" + id, minutes).apply();
            } catch (Exception ignored) {}
        }
        String note = "";
        if (minutes < 0) {
            minutes = prefs(c).getLong("trvmin_" + id, 30);
            note = located ? " (تقديري: ما قدرت أحسب الطريق)" : " (تقديري: ما قدرت أحدد موقعك)";
        }

        long leaveAt = due - minutes * 60_000L - bufferMs;
        // لسا بدري: نعيد الحساب قبل الطلعة بنص ساعة (الزحمة تتغير)
        if (leaveAt - now > 40 * 60_000L) {
            long next = Math.max(now + 10 * 60_000L, leaveAt - 30 * 60_000L);
            AlarmScheduler.scheduleFollow(c, a, "trv", next, 1);
            return;
        }
        try {
            JSONObject go = new JSONObject(a.toString());
            go.put("kind", "go");
            go.put("header", "اطلع الحين");
            String when = new SimpleDateFormat("h:mm", Locale.US).format(new Date(due)) + (new Date(due).getHours() < 12 ? " ص" : " م");
            go.put("body", "الطريق من موقعك " + minutes + " دقيقة" + (google ? " (بالزحمة الحالية)" : "") + note
                    + " · الموعد الساعة " + when + (a.optString("place").isEmpty() ? "" : " · " + a.optString("place")));
            if (leaveAt <= now + 60_000L) {
                go.put("key", id + ":go");
                AlarmReceiver.fire(c, go);
            } else {
                AlarmScheduler.scheduleFollow(c, go, "go", leaveAt, 1);
            }
        } catch (Exception ignored) {}
    }

    /** للواجهة: وقت الطريق من موقعك الحين. */
    static JSONObject estimate(Context c, double lat, double lng) {
        JSONObject o = new JSONObject();
        try {
            if (!hasLocationPerm(c)) return o.put("error", "فعّل صلاحية الموقع من الإعدادات");
            Location l = location(c, 15_000L);
            if (l == null) return o.put("error", "ما قدرت أحدد موقعك. تأكد إن الموقع (GPS) شغّال");
            long[] r = route(c, l.getLatitude(), l.getLongitude(), lat, lng);
            o.put("minutes", r[0]); o.put("km", Math.round(r[1] / 100.0) / 10.0); o.put("src", r[2] == 1 ? "google" : "osm");
        } catch (Exception e) {
            try { o.put("error", "ما قدرت أحسب الطريق"); } catch (Exception ignored) {}
        }
        return o;
    }
}
