package com.sekrteery.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** بعد إعادة تشغيل الجوال أو تحديث التطبيق: نرجع نجدول كل التنبيهات. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        Notif.ensureChannels(c);
        AlarmScheduler.rescheduleAll(c);
        if (AlarmStore.creds(c) != null) SyncJobService.schedule(c);
    }
}
