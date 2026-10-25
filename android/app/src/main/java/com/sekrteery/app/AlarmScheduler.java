package com.sekrteery.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

/** يجدول التنبيهات في نظام أندرويد (AlarmManager). */
final class AlarmScheduler {
    private static final int MAX = 120;

    private AlarmScheduler() {}

    static synchronized void rescheduleAll(Context c) {
        long now = System.currentTimeMillis();
        List<JSONObject> list = new ArrayList<>();
        JSONObject handled = AlarmStore.handled(c);

        JSONArray main = AlarmStore.main(c);
        for (int i = 0; i < main.length(); i++) {
            JSONObject a = main.optJSONObject(i);
            if (a == null) continue;
            long at = a.optLong("at");
            if (at < now - 60_000L) continue;
            // لو المستخدم ضغط "تم" أو "أجّل" من شاشة المنبه بعد ما انحسبت هذي القائمة، نتجاهله
            long h = handled.optLong(a.optString("id"), 0);
            if (h > 0 && !a.optString("key").endsWith(":s")) continue;
            list.add(a);
        }
        JSONObject f = AlarmStore.follow(c);
        Iterator<String> it = f.keys();
        while (it.hasNext()) {
            JSONObject a = f.optJSONObject(it.next());
            if (a != null && a.optLong("at") > now - 3600_000L) list.add(a);
        }
        Collections.sort(list, (x, y) -> Long.compare(x.optLong("at"), y.optLong("at")));
        if (list.size() > MAX) list = list.subList(0, MAX);

        Set<String> newKeys = new HashSet<>();
        for (JSONObject a : list) {
            schedule(c, a);
            newKeys.add(a.optString("key"));
        }
        for (String old : AlarmStore.scheduled(c)) {
            if (!newKeys.contains(old)) cancel(c, old);
        }
        AlarmStore.setScheduled(c, newKeys);
    }

    static PendingIntent pending(Context c, String key, String json) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.setAction("com.sekrteery.app.ALARM." + key);
        if (json != null) i.putExtra("alarm", json);
        int flags = PendingIntent.FLAG_IMMUTABLE | (json != null ? PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_NO_CREATE);
        return PendingIntent.getBroadcast(c, key.hashCode(), i, flags);
    }

    static void schedule(Context c, JSONObject a) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        String key = a.optString("key");
        long at = Math.max(a.optLong("at"), System.currentTimeMillis() + 2000L);
        PendingIntent pi = pending(c, key, a.toString());
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        boolean strong = !"normal".equals(a.optString("strength"));
        try {
            if (exact && strong) {
                Intent show = new Intent(c, MainActivity.class);
                PendingIntent showPi = PendingIntent.getActivity(c, 1, show, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, showPi), pi);
            } else if (exact) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static void cancel(Context c, String key) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pending(c, key, null);
        if (am != null && pi != null) { am.cancel(pi); pi.cancel(); }
    }

    /** تنبيه إضافي (تكرار/تأجيل) يُحفظ محلياً. */
    static void scheduleFollow(Context c, JSONObject base, String suffix, long at, int attempt) {
        try {
            JSONObject a = new JSONObject(base.toString());
            a.put("key", base.optString("id") + ":" + suffix);
            a.put("at", at);
            a.put("attempt", attempt);
            AlarmStore.putFollow(c, a);
            schedule(c, a);
            Set<String> s = AlarmStore.scheduled(c);
            s.add(a.optString("key"));
            AlarmStore.setScheduled(c, s);
        } catch (Exception ignored) {}
    }

    static void cancelAllFor(Context c, String id) {
        for (String k : AlarmStore.scheduled(c)) {
            if (k.startsWith(id + ":")) cancel(c, k);
        }
        AlarmStore.removeFollowFor(c, id);
    }
}
