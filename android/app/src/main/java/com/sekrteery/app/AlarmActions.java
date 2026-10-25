package com.sekrteery.app;

import android.content.Context;

import org.json.JSONObject;

/** أوامر "تم" و"أجّل" من شاشة المنبه أو من أزرار الإشعار. */
final class AlarmActions {
    private AlarmActions() {}

    static void done(Context c, JSONObject a) {
        String id = a.optString("id");
        Notif.cancel(c, id);
        AlarmScheduler.cancelAllFor(c, id);
        if ("test".equals(id)) return;
        AlarmStore.markHandled(c, id);
        long now = System.currentTimeMillis();
        try {
            JSONObject act = new JSONObject();
            act.put("id", id); act.put("action", "done"); act.put("at", now);
            AlarmStore.queueAction(c, act);
        } catch (Exception ignored) {}
        CloudSync.patchAsync(c, id, true, 0, now);
        AlarmScheduler.rescheduleAll(c);
    }

    static void snooze(Context c, JSONObject a, int minutes) {
        String id = a.optString("id");
        Notif.cancel(c, id);
        AlarmScheduler.cancelAllFor(c, id);
        long until = System.currentTimeMillis() + minutes * 60_000L;
        AlarmScheduler.scheduleFollow(c, a, "s", until, 1);
        if ("test".equals(id)) return;
        AlarmStore.markHandled(c, id);
        try {
            JSONObject act = new JSONObject();
            act.put("id", id); act.put("action", "snooze"); act.put("until", until);
            AlarmStore.queueAction(c, act);
        } catch (Exception ignored) {}
        CloudSync.patchAsync(c, id, false, until, System.currentTimeMillis());
    }

    /** لو تجاهل المنبه: نكرره حسب قوته. */
    static void ignored(Context c, JSONObject a) {
        String strength = a.optString("strength");
        int attempt = a.optInt("attempt", 1);
        int max = "repeat".equals(strength) ? 5 : 2;
        int gapMin = "repeat".equals(strength) ? 5 : 10;
        Notif.cancel(c, a.optString("id"));
        if (attempt < max) {
            AlarmScheduler.scheduleFollow(c, a, "r", System.currentTimeMillis() + gapMin * 60_000L, attempt + 1);
        } else {
            Notif.info(c, "فاتك تنبيه: " + a.optString("title"), a.optString("body") + " — افتح سكرتيري وأعد جدولته");
        }
    }
}
