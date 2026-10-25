package com.sekrteery.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.provider.Settings;

import org.json.JSONObject;

/** يستقبل التنبيه من النظام ويقرر: إشعار عادي أو شاشة كاملة. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        String json = intent.getStringExtra("alarm");
        if (json == null) return;
        JSONObject a;
        try { a = new JSONObject(json); } catch (Exception e) { return; }
        if ("travel".equals(a.optString("kind"))) {
            final JSONObject ta = a;
            AlarmStore.removeFollowKey(c, a.optString("key"));
            final PendingResult pr = goAsync();
            final Context app = c.getApplicationContext();
            new Thread(() -> {
                try { Travel.check(app, ta); } catch (Exception ignored) {}
                finally { pr.finish(); }
            }).start();
            return;
        }
        fire(c, a);
    }

    static void fire(Context c, JSONObject a) {
        String key = a.optString("key");
        AlarmStore.removeFollowKey(c, key);
        if ("normal".equals(a.optString("strength"))) {
            Notif.showNormal(c, a);
            return;
        }
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = null;
        if (pm != null) {
            wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sekrteery:alarm");
            wl.acquire(10_000L);
        }
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        try {
            if (nm != null) nm.notify(Notif.idFor(a.optString("id")), Notif.fullScreen(c, a));
        } catch (SecurityException ignored) {}
        // لو عنده صلاحية "الظهور فوق التطبيقات" نفتح الشاشة مباشرة حتى لو الجوال مفتوح ومستخدم
        if (Settings.canDrawOverlays(c)) {
            try {
                Intent i = new Intent(c, AlarmActivity.class);
                i.putExtra("alarm", a.toString());
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
                c.startActivity(i);
            } catch (Exception ignored) {}
        }
    }
}
