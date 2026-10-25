package com.sekrteery.app;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

import org.json.JSONArray;

/** كل ربع ساعة تقريباً: يسحب المواعيد الجديدة من السحابة (لو أضفتها من الكمبيوتر) ويجدولها. */
public class SyncJobService extends JobService {
    private static final int JOB_ID = 4201;

    static void schedule(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null) return;
        for (JobInfo j : js.getAllPendingJobs()) if (j.getId() == JOB_ID) return;
        JobInfo info = new JobInfo.Builder(JOB_ID, new ComponentName(c, SyncJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build();
        try { js.schedule(info); } catch (Exception ignored) {}
    }

    static void cancel(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js != null) js.cancel(JOB_ID);
    }

    /** مزامنة فورية مرة وحدة (مثلاً بعد تسجيل الدخول). */
    static void runNow(Context c) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            try {
                JSONArray list = CloudSync.pull(app);
                if (list != null) { AlarmStore.saveMain(app, list); AlarmScheduler.rescheduleAll(app); }
            } catch (Exception ignored) {}
        }).start();
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        final Context app = getApplicationContext();
        new Thread(() -> {
            boolean retry = false;
            try {
                JSONArray list = CloudSync.pull(app);
                if (list != null) {
                    AlarmStore.saveMain(app, list);
                    AlarmScheduler.rescheduleAll(app);
                }
            } catch (Exception e) {
                retry = true;
            }
            jobFinished(params, retry);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) { return true; }
}
