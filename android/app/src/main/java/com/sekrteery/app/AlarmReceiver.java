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
        AlarmStore.removeFollowKey(c, a.optString("key"));
        if ("normal".equals(a.optString("strength"))) {
            Notif.showNormal(c, a);
            return;
        }
        AlarmService.start(c, a);
    }

    /** احتياط لو النظام ما سمح بتشغيل خدمة المنبه. */
    static void legacyFire(Context c, JSONObject a) {
        Notif.showNormal(c, a);
        try {
            Intent i = new Intent(c, AlarmActivity.class);
            i.putExtra("alarm", a.toString());
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
            c.startActivity(i);
        } catch (Exception ignored) {}
    }
}
