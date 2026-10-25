package com.sekrteery.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;

import org.json.JSONObject;

/** قنوات الإشعارات وبناء الإشعارات. */
final class Notif {
    static final String CH_ALARM = "sk_alarm_v1";
    static final String CH_NORMAL = "sk_normal_v1";
    static final String CH_INFO = "sk_info_v1";

    private Notif() {}

    static void ensureChannels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel alarm = new NotificationChannel(CH_ALARM, "تنبيهات قوية (شاشة كاملة)", NotificationManager.IMPORTANCE_HIGH);
        alarm.setDescription("المواعيد والمهام المهمة والعاجلة");
        alarm.setSound(null, null); // الصوت يشغله التطبيق نفسه بصوت المنبه
        alarm.enableVibration(false);
        alarm.setBypassDnd(true);
        alarm.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(alarm);

        NotificationChannel normal = new NotificationChannel(CH_NORMAL, "تنبيهات عادية", NotificationManager.IMPORTANCE_HIGH);
        normal.setDescription("المواعيد والمهام العادية");
        normal.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
        normal.enableVibration(true);
        nm.createNotificationChannel(normal);

        NotificationChannel info = new NotificationChannel(CH_INFO, "معلومات (الميزانية وغيرها)", NotificationManager.IMPORTANCE_DEFAULT);
        nm.createNotificationChannel(info);
    }

    static int idFor(String key) { return key.hashCode() & 0x7fffffff; }

    static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static PendingIntent action(Context c, String act, JSONObject alarm, int minutes) {
        Intent i = new Intent(c, ActionReceiver.class);
        i.setAction("com.sekrteery.app." + act + "." + alarm.optString("key"));
        i.putExtra("alarm", alarm.toString());
        i.putExtra("op", act);
        i.putExtra("minutes", minutes);
        return PendingIntent.getBroadcast(c, (act + alarm.optString("key")).hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** إشعار عادي مع أزرار تم / أجّل. */
    static void showNormal(Context c, JSONObject a) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        ensureChannels(c);
        String title = a.optString("header") + ": " + a.optString("title");
        Notification.Builder b = new Notification.Builder(c, CH_NORMAL)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title)
                .setContentText(a.optString("body"))
                .setStyle(new Notification.BigTextStyle().bigText(a.optString("body")))
                .setCategory(Notification.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(openApp(c))
                .setColor(0xFF0F5F59)
                .addAction(new Notification.Action.Builder(null, "تم", action(c, "DONE", a, 0)).build())
                .addAction(new Notification.Action.Builder(null, "أجّل ١٠ دقائق", action(c, "SNOOZE", a, 10)).build())
                .addAction(new Notification.Action.Builder(null, "أجّل ساعة", action(c, "SNOOZE", a, 60)).build());
        try { nm.notify(idFor(a.optString("id")), b.build()); } catch (SecurityException ignored) {}
    }

    /** إشعار الشاشة الكاملة: يفتح شاشة المنبه. */
    static Notification fullScreen(Context c, JSONObject a) {
        ensureChannels(c);
        Intent i = new Intent(c, AlarmActivity.class);
        i.putExtra("alarm", a.toString());
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fs = PendingIntent.getActivity(c, idFor(a.optString("key")), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        boolean urgent = "urgent".equals(a.optString("level")) || "repeat".equals(a.optString("strength"));
        return new Notification.Builder(c, CH_ALARM)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(a.optString("header") + ": " + a.optString("title"))
                .setContentText(a.optString("body"))
                .setCategory(Notification.CATEGORY_ALARM)
                .setFullScreenIntent(fs, true)
                .setContentIntent(fs)
                .setOngoing(true)
                .setColor(urgent ? 0xFFA3191C : 0xFFB54708)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(new Notification.Action.Builder(null, "تم", action(c, "DONE", a, 0)).build())
                .addAction(new Notification.Action.Builder(null, "أجّل ١٠ دقائق", action(c, "SNOOZE", a, 10)).build())
                .build();
    }

    static void info(Context c, String title, String body) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        ensureChannels(c);
        Notification n = new Notification.Builder(c, CH_INFO)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title).setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true).setContentIntent(openApp(c)).setColor(0xFF0F5F59).build();
        try { nm.notify((title + body).hashCode() & 0x7fffffff, n); } catch (SecurityException ignored) {}
    }

    static void cancel(Context c, String id) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(idFor(id));
    }
}
