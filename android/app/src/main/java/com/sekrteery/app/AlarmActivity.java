package com.sekrteery.app;

import android.app.Activity;
import android.provider.Settings;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** شاشة المنبه الكاملة: ما تختفي إلا لما تختار تم أو أجّل. */
public class AlarmActivity extends Activity {
    private static final long RING_MS = 60_000L;
    private static WeakReference<AlarmActivity> current;

    private JSONObject alarm;
    private MediaPlayer player;
    private Vibrator vibrator;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView clock;
    private boolean handled = false;

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (clock != null) clock.setText(new SimpleDateFormat("h:mm", Locale.US).format(new Date()));
            handler.postDelayed(this, 1000);
        }
    };
    private final Runnable timeout = () -> {
        if (handled) return;
        handled = true;
        stopRinging();
        AlarmActions.ignored(this, alarm);
        finish();
    };

    static void stopIfShowing(String id) {
        AlarmActivity a = current != null ? current.get() : null;
        if (a != null && a.alarm != null && id.equals(a.alarm.optString("id"))) {
            a.handled = true;
            a.stopRinging();
            a.finish();
        }
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        current = new WeakReference<>(this);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        load(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent.getBooleanExtra("bringBack", false) && !handled) return; // نفس التنبيه رجع قدام
        // تنبيه جديد وهذا مفتوح: نعتبر القديم متجاهل ونعرض الجديد
        if (alarm != null && !handled) AlarmActions.ignored(this, alarm);
        stopRinging();
        handler.removeCallbacks(timeout);
        handled = false;
        load(intent);
    }

    private void load(Intent intent) {
        try { alarm = new JSONObject(intent.getStringExtra("alarm")); } catch (Exception e) { finish(); return; }
        build();
        startRinging();
        handler.removeCallbacks(tick);
        handler.post(tick);
        handler.postDelayed(timeout, RING_MS);
    }

    private int dp(float v) { return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()); }

    private TextView text(String s, float sp, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(Color.WHITE);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setTextDirection(View.TEXT_DIRECTION_RTL);
        t.setGravity(Gravity.START);
        return t;
    }

    private Button button(String s, boolean primary, int bg) {
        Button btn = new Button(this);
        btn.setText(s);
        btn.setAllCaps(false);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, primary ? 22 : 17);
        btn.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable d = new GradientDrawable();
        d.setCornerRadius(dp(18));
        if (primary) { d.setColor(Color.WHITE); btn.setTextColor(bg == 0xFFA3191C ? 0xFF8E1B12 : 0xFF7A2E05); }
        else { d.setColor(Color.TRANSPARENT); d.setStroke(dp(2), 0xB3FFFFFF); btn.setTextColor(Color.WHITE); }
        btn.setBackground(d);
        btn.setStateListAnimator(null);
        return btn;
    }

    private void build() {
        boolean urgent = "urgent".equals(alarm.optString("level")) || "repeat".equals(alarm.optString("strength"));
        int bg = urgent ? 0xFFA3191C : 0xFFB54708;
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        int attempt = alarm.optInt("attempt", 1);
        int max = "repeat".equals(alarm.optString("strength")) ? 5 : 2;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setBackgroundColor(bg);
        root.setPadding(dp(24), dp(40), dp(24), dp(28));

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView pill = text(urgent ? "تنبيه عاجل" : "تنبيه مهم", 15, true);
        GradientDrawable pd = new GradientDrawable(); pd.setColor(0x38000000); pd.setCornerRadius(dp(999));
        pill.setBackground(pd); pill.setPadding(dp(14), dp(8), dp(14), dp(8));
        top.addView(pill);
        View sp = new View(this); top.addView(sp, new LinearLayout.LayoutParams(0, 1, 1f));
        top.addView(text("التنبيه " + attempt + " من " + max, 14, false));
        root.addView(top);

        TextView header = text(alarm.optString("header"), 19, false);
        LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(-1, -2); hp.topMargin = dp(36);
        root.addView(header, hp);
        TextView title = text(alarm.optString("title"), 36, true);
        title.setLineSpacing(0, 1.15f);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(-1, -2); tp.topMargin = dp(8);
        root.addView(title, tp);
        TextView body = text(alarm.optString("body"), 17, false);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-1, -2); bp.topMargin = dp(8);
        root.addView(body, bp);

        clock = text("", 84, true);
        clock.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-1, 0, 1f);
        clock.setGravity(Gravity.CENTER);
        root.addView(clock, cp);

        TextView rep = text(urgent ? "يتكرر كل ٥ دقائق لين تختار" : "يرجع ينبهك بعد ١٠ دقائق لو ما اخترت", 14, false);
        rep.setGravity(Gravity.CENTER);
        root.addView(rep, new LinearLayout.LayoutParams(-1, -2));

        Button done = button("✓  تم", true, bg);
        LinearLayout.LayoutParams dpp = new LinearLayout.LayoutParams(-1, dp(66)); dpp.topMargin = dp(18);
        root.addView(done, dpp);
        done.setOnClickListener(v -> act("done", 0));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        Button s10 = button("أجّل ١٠ دقائق", false, bg);
        Button s60 = button("أجّل ساعة", false, bg);
        LinearLayout.LayoutParams l1 = new LinearLayout.LayoutParams(0, dp(58), 1f); l1.setMarginEnd(dp(6));
        LinearLayout.LayoutParams l2 = new LinearLayout.LayoutParams(0, dp(58), 1f); l2.setMarginStart(dp(6));
        row.addView(s10, l1); row.addView(s60, l2);
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2); rp.topMargin = dp(12);
        root.addView(row, rp);
        s10.setOnClickListener(v -> act("snooze", 10));
        s60.setOnClickListener(v -> act("snooze", 60));

        TextView foot = text("الشاشة ما تختفي إلا بعد ما تختار", 13, false);
        foot.setGravity(Gravity.CENTER); foot.setAlpha(0.9f);
        LinearLayout.LayoutParams fp = new LinearLayout.LayoutParams(-1, -2); fp.topMargin = dp(14);
        root.addView(foot, fp);

        setContentView(root);
    }

    private void act(String what, int minutes) {
        if (handled) return;
        handled = true;
        handler.removeCallbacks(timeout);
        stopRinging();
        if ("done".equals(what)) AlarmActions.done(this, alarm);
        else AlarmActions.snooze(this, alarm, minutes);
        finish();
    }

    private void startRinging() {
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
        } catch (Exception e) {
            player = null;
        }
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null) {
                long[] pattern = {0, 800, 600, 800, 600};
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0),
                        new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
            }
        } catch (Exception ignored) {}
    }

    void stopRinging() {
        try { if (player != null) { player.stop(); player.release(); } } catch (Exception ignored) {}
        player = null;
        try { if (vibrator != null) vibrator.cancel(); } catch (Exception ignored) {}
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        // لو ضغط زر الهوم: نرجّع الشاشة قدامه (يحتاج صلاحية الظهور فوق التطبيقات)
        if (!handled && alarm != null && Settings.canDrawOverlays(this)) {
            final String json = alarm.toString();
            handler.postDelayed(() -> {
                if (handled) return;
                Intent i = new Intent(this, AlarmActivity.class);
                i.putExtra("alarm", json);
                i.putExtra("bringBack", true);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                try { startActivity(i); } catch (Exception ignored) {}
            }, 700);
        }
    }

    @Override
    public void onBackPressed() {
        // ممنوع الرجوع: لازم تختار
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (!handled && alarm != null && !isChangingConfigurations()) {
            handled = true;
            AlarmActions.ignored(this, alarm);
        }
        stopRinging();
        super.onDestroy();
    }
}
