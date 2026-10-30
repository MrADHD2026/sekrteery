package com.sekrteery.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;

import org.json.JSONObject;

import java.lang.ref.WeakReference;

/** شاشة المنبه فوق شاشة القفل. الصوت والتكرار تابعين لخدمة المنبه (AlarmService). */
public class AlarmActivity extends Activity {
    private static WeakReference<AlarmActivity> current;
    private JSONObject alarm;
    private AlarmUi ui;
    private final Handler h = new Handler(Looper.getMainLooper());
    private final Runnable tick = new Runnable() {
        @Override public void run() { if (ui != null) ui.tick(); h.postDelayed(this, 1000); }
    };

    static void finishShowing() {
        AlarmActivity a = current != null ? current.get() : null;
        if (a != null) a.finish();
    }

    static void stopIfShowing(String id) {
        AlarmActivity a = current != null ? current.get() : null;
        if (a != null && a.alarm != null && id.equals(a.alarm.optString("id"))) a.finish();
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        current = new WeakReference<>(this);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        load(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        load(intent);
    }

    private void load(Intent intent) {
        // نعرض التنبيه اللي ترن فيه الخدمة الحين لو موجود
        JSONObject a = AlarmService.current != null ? AlarmService.current.currentAlarm() : null;
        if (a == null) { try { a = new JSONObject(intent.getStringExtra("alarm")); } catch (Exception e) { finish(); return; } }
        alarm = a;
        ui = AlarmUi.build(this, alarm, new AlarmUi.Actions() {
            @Override public void done() { act(AlarmService.ACT_DONE, 0); }
            @Override public void snooze(int m) { act(AlarmService.ACT_SNOOZE, m); }
        });
        getWindow().setStatusBarColor(AlarmUi.bg(alarm));
        getWindow().setNavigationBarColor(AlarmUi.bg(alarm));
        setContentView(ui.root);
        h.removeCallbacks(tick);
        h.post(tick);
    }

    private void act(String what, int minutes) {
        AlarmService.action(this, what, alarm, minutes);
        finish();
    }

    @Override
    public void onBackPressed() { /* ممنوع الرجوع: لازم تختار */ }

    @Override
    protected void onDestroy() {
        h.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
