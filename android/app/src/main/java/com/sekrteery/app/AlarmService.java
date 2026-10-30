package com.sekrteery.app;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;

import org.json.JSONObject;

/**
 * المنبه القوي: يشغّل الصوت، ويغطي الشاشة فوق كل التطبيقات لين تختار "تم" أو "أجّل".
 * الصوت والشاشة تابعين للخدمة، فإغلاق التطبيق من قائمة التطبيقات الأخيرة ما يوقفهم.
 */
public class AlarmService extends Service {
    static final String ACT_SHOW = "show", ACT_DONE = "done", ACT_SNOOZE = "snooze";
    private static final long RING_MS = 60_000L;
    private static final int NOTIF_ID = 777;
    static AlarmService current;

    private JSONObject alarm;
    private MediaPlayer player;
    private Vibrator vibrator;
    private WindowManager wm;
    private AlarmUi overlay;
    private boolean overlayAdded = false, ringing = false, pausedForCall = false;
    private PowerManager.WakeLock wake;
    private final Handler h = new Handler(Looper.getMainLooper());

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (overlay != null) overlay.tick();
            checkCall();
            h.postDelayed(this, 1000);
        }
    };
    private final Runnable ringTimeout = this::onRingTimeout;

    static void start(Context c, JSONObject a) {
        Intent i = new Intent(c, AlarmService.class).setAction(ACT_SHOW).putExtra("alarm", a.toString());
        try {
            c.startForegroundService(i);
        } catch (Exception e) {
            // ما سمح النظام بتشغيل الخدمة: نرجع للطريقة القديمة (إشعار + شاشة)
            AlarmReceiver.legacyFire(c, a);
        }
    }

    static void action(Context c, String act, JSONObject a, int minutes) {
        if (current != null && current.alarm != null && a.optString("id").equals(current.alarm.optString("id"))) {
            current.handle(act, minutes);
            return;
        }
        if (ACT_DONE.equals(act)) AlarmActions.done(c, a); else AlarmActions.snooze(c, a, minutes);
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        current = this;
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { stopAll(); return START_NOT_STICKY; }
        String act = intent.getAction();
        if (ACT_SHOW.equals(act)) {
            JSONObject a;
            try { a = new JSONObject(intent.getStringExtra("alarm")); } catch (Exception e) { stopAll(); return START_NOT_STICKY; }
            foreground(a);
            if (alarm != null && !alarm.optString("id").equals(a.optString("id")) && ringing) {
                // تنبيه ثاني وصل وهذا لسا يرن: نأجل الأول تلقائياً بالتكرار
                AlarmActions.ignored(this, alarm);
            }
            show(a);
        } else if (ACT_DONE.equals(act) || ACT_SNOOZE.equals(act)) {
            handle(act, intent.getIntExtra("minutes", 10));
        }
        return START_NOT_STICKY;
    }

    private void foreground(JSONObject a) {
        android.app.Notification n = Notif.fullScreen(this, a);
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(NOTIF_ID, n);
        } catch (Exception e) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            try { if (nm != null) nm.notify(NOTIF_ID, n); } catch (Exception ignored) {}
        }
    }

    private void show(JSONObject a) {
        alarm = a;
        h.removeCallbacks(ringTimeout);
        removeOverlay();
        // لو فيه مكالمة: ما نغطي الشاشة ولا نرن، نكتفي بالإشعار وننتظر لين تخلص
        if (inCall()) { pausedForCall = true; ringing = true; h.postDelayed(ringTimeout, RING_MS * 3); startTick(); return; }
        addOverlay();
        startRinging();
        h.postDelayed(ringTimeout, RING_MS);
        startTick();
    }

    private void startTick() { h.removeCallbacks(tick); h.post(tick); }

    private void addOverlay() {
        if (!Settings.canDrawOverlays(this) || wm == null) {
            // بدون صلاحية الظهور فوق التطبيقات: نفتح شاشة المنبه
            openActivity();
            return;
        }
        overlay = AlarmUi.build(this, alarm, new AlarmUi.Actions() {
            @Override public void done() { handle(ACT_DONE, 0); }
            @Override public void snooze(int m) { handle(ACT_SNOOZE, m); }
        });
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                        | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
                PixelFormat.OPAQUE);
        lp.gravity = Gravity.TOP;
        lp.setTitle("sekrteery-alarm");
        try { wm.addView(overlay.root, lp); overlayAdded = true; } catch (Exception e) { overlay = null; openActivity(); }
        // لو الجوال مقفل: الشاشة فوق التطبيقات ما تطلع فوق القفل، فنفتح شاشة المنبه بعد
        KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        if (km != null && km.isKeyguardLocked()) openActivity();
    }

    private void openActivity() {
        try {
            Intent i = new Intent(this, AlarmActivity.class).putExtra("alarm", alarm.toString());
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
            startActivity(i);
        } catch (Exception ignored) {}
    }

    private void removeOverlay() {
        if (overlayAdded && overlay != null && wm != null) {
            try { wm.removeView(overlay.root); } catch (Exception ignored) {}
        }
        overlayAdded = false; overlay = null;
    }

    private boolean inCall() {
        AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
        if (am == null) return false;
        int m = am.getMode();
        return m == AudioManager.MODE_RINGTONE || m == AudioManager.MODE_IN_CALL || m == AudioManager.MODE_IN_COMMUNICATION;
    }

    /** مكالمة جاية أو شغالة: نخفي الشاشة ونسكت لين تخلص، عشان تقدر ترد. */
    private void checkCall() {
        if (alarm == null) return;
        boolean call = inCall();
        if (call && !pausedForCall) {
            pausedForCall = true;
            stopRinging();
            removeOverlay();
            AlarmActivity.finishShowing();
        } else if (!call && pausedForCall) {
            pausedForCall = false;
            addOverlay();
            if (ringing) startRinging();
        }
    }

    private void onRingTimeout() {
        if (alarm == null) return;
        stopRinging();
        ringing = false;
        int attempt = alarm.optInt("attempt", 1);
        int max = "repeat".equals(alarm.optString("strength")) ? 5 : 2;
        if (attempt >= max) {
            // آخر محاولة: نفك الشاشة ونرسل "فاتك"
            AlarmActions.ignored(this, alarm);
            stopAll();
            return;
        }
        AlarmActions.ignored(this, alarm); // يجدول المحاولة الجاية
        int gap = "repeat".equals(alarm.optString("strength")) ? 5 : 10;
        if (overlay != null) overlay.setStatus("سكت مؤقتاً · يرن مرة ثانية بعد " + gap + " دقائق · اختر عشان تكمل استخدام الجوال");
        // الشاشة تبقى، والخدمة تبقى لين المحاولة الجاية أو لين تختار
    }

    private void handle(String act, int minutes) {
        if (alarm == null) { stopAll(); return; }
        JSONObject a = alarm;
        h.removeCallbacks(ringTimeout);
        stopRinging();
        if (ACT_DONE.equals(act)) AlarmActions.done(this, a); else AlarmActions.snooze(this, a, minutes);
        stopAll();
    }

    private void stopAll() {
        h.removeCallbacksAndMessages(null);
        stopRinging();
        removeOverlay();
        AlarmActivity.finishShowing();
        if (alarm != null) Notif.cancel(this, alarm.optString("id"));
        alarm = null;
        ringing = false; pausedForCall = false;
        try { stopForeground(STOP_FOREGROUND_REMOVE); } catch (Exception ignored) {}
        stopSelf();
    }

    private void startRinging() {
        stopRinging();
        ringing = true;
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) { wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sekrteery:ring"); wake.acquire(RING_MS + 5000); }
        try {
            Uri uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM);
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            player.setDataSource(this, uri);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) { player = null; }
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null) vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 800, 600, 800, 600}, 0),
                    new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
        } catch (Exception ignored) {}
    }

    private void stopRinging() {
        try { if (player != null) { player.stop(); player.release(); } } catch (Exception ignored) {}
        player = null;
        try { if (vibrator != null) vibrator.cancel(); } catch (Exception ignored) {}
        try { if (wake != null && wake.isHeld()) wake.release(); } catch (Exception ignored) {}
    }

    JSONObject currentAlarm() { return alarm; }

    @Override
    public void onDestroy() {
        h.removeCallbacksAndMessages(null);
        stopRinging();
        removeOverlay();
        if (current == this) current = null;
        super.onDestroy();
    }
}
