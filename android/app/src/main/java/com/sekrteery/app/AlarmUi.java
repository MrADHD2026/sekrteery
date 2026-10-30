package com.sekrteery.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** واجهة المنبه (نفسها في الشاشة فوق التطبيقات وفي شاشة القفل). */
final class AlarmUi {
    interface Actions { void done(); void snooze(int minutes); }

    final View root;
    private final TextView clock, status;

    private AlarmUi(View root, TextView clock, TextView status) { this.root = root; this.clock = clock; this.status = status; }

    static boolean urgent(JSONObject a) { return "urgent".equals(a.optString("level")) || "repeat".equals(a.optString("strength")); }
    static int bg(JSONObject a) { return urgent(a) ? 0xFFA3191C : 0xFFB54708; }

    void tick() { clock.setText(new SimpleDateFormat("h:mm", Locale.US).format(new Date())); }
    void setStatus(String s) { status.setText(s); }

    static AlarmUi build(Context c, JSONObject alarm, Actions act) {
        final float dens = c.getResources().getDisplayMetrics().density;
        java.util.function.IntUnaryOperator dp = v -> (int) (v * dens);
        boolean urgent = urgent(alarm);
        int bg = bg(alarm);
        int attempt = alarm.optInt("attempt", 1);
        int max = "repeat".equals(alarm.optString("strength")) ? 5 : 2;

        LinearLayout root = new LinearLayout(c);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setBackgroundColor(bg);
        root.setPadding(dp.applyAsInt(24), dp.applyAsInt(48), dp.applyAsInt(24), dp.applyAsInt(36));
        root.setClickable(true);

        LinearLayout top = new LinearLayout(c);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView pill = text(c, urgent ? "تنبيه عاجل" : "تنبيه مهم", 15, true);
        GradientDrawable pd = new GradientDrawable(); pd.setColor(0x38000000); pd.setCornerRadius(dp.applyAsInt(999));
        pill.setBackground(pd); pill.setPadding(dp.applyAsInt(14), dp.applyAsInt(8), dp.applyAsInt(14), dp.applyAsInt(8));
        top.addView(pill);
        top.addView(new View(c), new LinearLayout.LayoutParams(0, 1, 1f));
        top.addView(text(c, "التنبيه " + attempt + " من " + max, 14, false));
        root.addView(top);

        TextView header = text(c, alarm.optString("header"), 19, false);
        LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(-1, -2); hp.topMargin = dp.applyAsInt(32);
        root.addView(header, hp);
        TextView title = text(c, alarm.optString("title"), 34, true);
        title.setLineSpacing(0, 1.15f);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(-1, -2); tp.topMargin = dp.applyAsInt(8);
        root.addView(title, tp);
        TextView body = text(c, alarm.optString("body"), 17, false);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-1, -2); bp.topMargin = dp.applyAsInt(8);
        root.addView(body, bp);

        TextView clock = text(c, "", 80, true);
        clock.setGravity(Gravity.CENTER);
        root.addView(clock, new LinearLayout.LayoutParams(-1, 0, 1f));

        TextView status = text(c, urgent ? "يتكرر كل ٥ دقائق لين تختار" : "يرجع ينبهك بعد ١٠ دقائق لو ما اخترت", 14, false);
        status.setGravity(Gravity.CENTER);
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));

        Button done = button(c, dp, "✓  تم", true, bg);
        LinearLayout.LayoutParams dpp = new LinearLayout.LayoutParams(-1, dp.applyAsInt(66)); dpp.topMargin = dp.applyAsInt(18);
        root.addView(done, dpp);
        done.setOnClickListener(v -> act.done());

        LinearLayout row = new LinearLayout(c);
        row.setOrientation(LinearLayout.HORIZONTAL);
        Button s10 = button(c, dp, "أجّل ١٠ دقائق", false, bg);
        Button s60 = button(c, dp, "أجّل ساعة", false, bg);
        LinearLayout.LayoutParams l1 = new LinearLayout.LayoutParams(0, dp.applyAsInt(58), 1f); l1.setMarginEnd(dp.applyAsInt(6));
        LinearLayout.LayoutParams l2 = new LinearLayout.LayoutParams(0, dp.applyAsInt(58), 1f); l2.setMarginStart(dp.applyAsInt(6));
        row.addView(s10, l1); row.addView(s60, l2);
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2); rp.topMargin = dp.applyAsInt(12);
        root.addView(row, rp);
        s10.setOnClickListener(v -> act.snooze(10));
        s60.setOnClickListener(v -> act.snooze(60));

        TextView foot = text(c, "ما تقدر تستخدم الجوال لين تختار", 13, false);
        foot.setGravity(Gravity.CENTER); foot.setAlpha(0.9f);
        LinearLayout.LayoutParams fp = new LinearLayout.LayoutParams(-1, -2); fp.topMargin = dp.applyAsInt(14);
        root.addView(foot, fp);

        AlarmUi ui = new AlarmUi(root, clock, status);
        ui.tick();
        return ui;
    }

    private static TextView text(Context c, String s, float sp, boolean bold) {
        TextView t = new TextView(c);
        t.setText(s);
        t.setTextColor(Color.WHITE);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setTextDirection(View.TEXT_DIRECTION_RTL);
        t.setGravity(Gravity.START);
        return t;
    }

    private static Button button(Context c, java.util.function.IntUnaryOperator dp, String s, boolean primary, int bg) {
        Button btn = new Button(c);
        btn.setText(s);
        btn.setAllCaps(false);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, primary ? 22 : 17);
        btn.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable d = new GradientDrawable();
        d.setCornerRadius(dp.applyAsInt(18));
        if (primary) { d.setColor(Color.WHITE); btn.setTextColor(bg == 0xFFA3191C ? 0xFF8E1B12 : 0xFF7A2E05); }
        else { d.setColor(Color.TRANSPARENT); d.setStroke(dp.applyAsInt(2), 0xB3FFFFFF); btn.setTextColor(Color.WHITE); }
        btn.setBackground(d);
        btn.setStateListAnimator(null);
        return btn;
    }
}
