package com.sekrteery.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONObject;

/** أزرار الإشعار: تم / أجّل. */
public class ActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        String json = intent.getStringExtra("alarm");
        if (json == null) return;
        JSONObject a;
        try { a = new JSONObject(json); } catch (Exception e) { return; }
        AlarmActivity.stopIfShowing(a.optString("id"));
        if ("DONE".equals(intent.getStringExtra("op"))) AlarmService.action(c, AlarmService.ACT_DONE, a, 0);
        else AlarmService.action(c, AlarmService.ACT_SNOOZE, a, intent.getIntExtra("minutes", 10));
    }
}
