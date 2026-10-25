package com.sekrteery.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

/** تخزين التنبيهات والأوامر المعلّقة في SharedPreferences. */
final class AlarmStore {
    private static final String PREFS = "sk";
    private static final String K_MAIN = "alarms_main";
    private static final String K_FOLLOW = "alarms_follow";
    private static final String K_SCHEDULED = "scheduled_keys";
    private static final String K_ACTIONS = "pending_actions";
    private static final String K_CREDS = "sync_creds";
    private static final String K_HANDLED = "handled_keys";

    private AlarmStore() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONArray arr(Context c, String key) {
        try { return new JSONArray(prefs(c).getString(key, "[]")); } catch (JSONException e) { return new JSONArray(); }
    }

    // ---- التنبيهات الأساسية (من الواجهة أو من السحابة)
    static synchronized void saveMain(Context c, JSONArray list) {
        prefs(c).edit().putString(K_MAIN, list.toString()).apply();
    }
    static synchronized JSONArray main(Context c) { return arr(c, K_MAIN); }

    // ---- التكرار والتأجيل (محلي على الجوال)
    static synchronized JSONObject follow(Context c) {
        try { return new JSONObject(prefs(c).getString(K_FOLLOW, "{}")); } catch (JSONException e) { return new JSONObject(); }
    }
    static synchronized void putFollow(Context c, JSONObject alarm) {
        JSONObject f = follow(c);
        try { f.put(alarm.optString("key"), alarm); } catch (JSONException ignored) {}
        prefs(c).edit().putString(K_FOLLOW, f.toString()).apply();
    }
    static synchronized void removeFollowFor(Context c, String id) {
        JSONObject f = follow(c);
        Iterator<String> it = f.keys();
        Set<String> rm = new HashSet<>();
        while (it.hasNext()) {
            String k = it.next();
            JSONObject a = f.optJSONObject(k);
            if (a != null && id.equals(a.optString("id"))) rm.add(k);
        }
        for (String k : rm) f.remove(k);
        prefs(c).edit().putString(K_FOLLOW, f.toString()).apply();
    }
    static synchronized void removeFollowKey(Context c, String key) {
        JSONObject f = follow(c);
        f.remove(key);
        prefs(c).edit().putString(K_FOLLOW, f.toString()).apply();
    }

    // ---- المفاتيح المجدولة (عشان نلغيها لما تتغير القائمة)
    static synchronized Set<String> scheduled(Context c) {
        return new HashSet<>(prefs(c).getStringSet(K_SCHEDULED, new HashSet<>()));
    }
    static synchronized void setScheduled(Context c, Set<String> keys) {
        prefs(c).edit().putStringSet(K_SCHEDULED, new HashSet<>(keys)).apply();
    }

    // ---- عناصر خلصت أو تأجلت من شاشة المنبه (عشان ما يرجع يرن قبل ما تتحدث القائمة)
    static synchronized JSONObject handled(Context c) {
        try { return new JSONObject(prefs(c).getString(K_HANDLED, "{}")); } catch (JSONException e) { return new JSONObject(); }
    }
    static synchronized void markHandled(Context c, String id) {
        JSONObject h = handled(c);
        try {
            h.put(id, System.currentTimeMillis());
            // ننظف القديم (أكثر من يومين)
            Iterator<String> it = h.keys();
            Set<String> rm = new HashSet<>();
            long now = System.currentTimeMillis();
            while (it.hasNext()) { String k = it.next(); if (now - h.optLong(k) > 2L * 86400000L) rm.add(k); }
            for (String k : rm) h.remove(k);
        } catch (JSONException ignored) {}
        prefs(c).edit().putString(K_HANDLED, h.toString()).apply();
    }

    // ---- أوامر تنتظر الواجهة (تم / تأجيل)
    static synchronized void queueAction(Context c, JSONObject action) {
        JSONArray a = arr(c, K_ACTIONS);
        a.put(action);
        prefs(c).edit().putString(K_ACTIONS, a.toString()).apply();
    }
    static synchronized String takeActions(Context c) {
        String s = prefs(c).getString(K_ACTIONS, "[]");
        prefs(c).edit().putString(K_ACTIONS, "[]").apply();
        return s;
    }

    // ---- بيانات المزامنة
    static synchronized void setCreds(Context c, String json) {
        if (json == null || json.equals("null") || json.equals("{}")) prefs(c).edit().remove(K_CREDS).apply();
        else prefs(c).edit().putString(K_CREDS, json).apply();
    }
    static synchronized JSONObject creds(Context c) {
        String s = prefs(c).getString(K_CREDS, null);
        if (s == null) return null;
        try {
            JSONObject o = new JSONObject(s);
            return o.has("uid") && o.has("refreshToken") ? o : null;
        } catch (JSONException e) { return null; }
    }
}
