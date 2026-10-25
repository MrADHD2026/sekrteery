package com.sekrteery.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/** الشاشة الرئيسية: تعرض واجهة سكرتيري (نفس ملفات الموقع) داخل WebView. */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    private static final int REQ_VOICE = 701;
    private static final int REQ_NOTIF = 702;

    private WebView web;
    private String voiceCb;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Notif.ensureChannels(this);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setTextZoom(100);
        WebView.setWebContentsDebuggingEnabled(true);
        web.setBackgroundColor(0xFFF5F3EE);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new LocalClient());
        web.addJavascriptInterface(new Bridge(), "SKNative");
        setContentView(web);

        if (b != null) web.restoreState(b);
        else web.loadUrl("https://" + HOST + "/index.html");

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        }
        AlarmScheduler.rescheduleAll(this);
        if (AlarmStore.creds(this) != null) SyncJobService.schedule(this);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.SKBridge && SKBridge.onResume()", null);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_VOICE) {
            String text = null;
            if (res == RESULT_OK && data != null) {
                ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (r != null && !r.isEmpty()) text = r.get(0);
            }
            sendVoice(voiceCb, text, text == null ? "ما سمعت شي، جرب مرة ثانية أو اكتب" : null);
            voiceCb = null;
        }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] p, int[] g) {
        super.onRequestPermissionsResult(req, p, g);
        if (web != null) web.evaluateJavascript("window.SKBridge && SKBridge.onResume()", null);
    }

    private void sendVoice(String id, String text, String err) {
        if (id == null || web == null) return;
        String js = "window.SKBridge && SKBridge.onVoice(" + JSONObject.quote(id) + "," + (text == null ? "null" : JSONObject.quote(text))
                + "," + (err == null ? "null" : JSONObject.quote(err)) + ")";
        web.evaluateJavascript(js, null);
    }

    // ---------- يخدم ملفات الواجهة من داخل التطبيق ----------
    private class LocalClient extends WebViewClient {
        private final Map<String, String> mimes = new HashMap<>();
        LocalClient() {
            mimes.put("html", "text/html"); mimes.put("js", "application/javascript"); mimes.put("css", "text/css");
            mimes.put("svg", "image/svg+xml"); mimes.put("png", "image/png"); mimes.put("json", "application/json");
            mimes.put("webmanifest", "application/manifest+json"); mimes.put("woff2", "font/woff2");
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
            path = path.substring(1);
            if (path.contains("..")) return null;
            try {
                InputStream is = getAssets().open(path);
                String ext = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : "";
                String mime = mimes.containsKey(ext) ? mimes.get(ext) : "application/octet-stream";
                WebResourceResponse r = new WebResourceResponse(mime, "UTF-8", is);
                Map<String, String> h = new HashMap<>();
                h.put("Cache-Control", "no-cache");
                r.setResponseHeaders(h);
                return r;
            } catch (Exception e) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), null);
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (HOST.equals(u.getHost())) return false;
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
            return true;
        }
    }

    // ---------- الجسر اللي تستخدمه الواجهة ----------
    private class Bridge {
        private final Context c = MainActivity.this.getApplicationContext();

        @JavascriptInterface public String version() {
            try { return "v" + getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "app"; }
        }

        @JavascriptInterface public void syncAlarms(String json) {
            try {
                AlarmStore.saveMain(c, new JSONArray(json));
                // الواجهة طبّقت أوامر شاشة المنبه قبل ما ترسل القائمة، فنمسح العلامات
                AlarmStore.prefs(c).edit().remove("handled_keys").apply();
                AlarmScheduler.rescheduleAll(c);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface public void notify(String title, String body) { Notif.info(c, title, body); }

        @JavascriptInterface public void testAlarm(String json) {
            try {
                JSONObject a = new JSONObject(json);
                AlarmScheduler.scheduleFollow(c, a, "t" + System.currentTimeMillis(), a.optLong("at"), 1);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface public String permissions() {
            JSONObject o = new JSONObject();
            try {
                NotificationManager nm = c.getSystemService(NotificationManager.class);
                boolean notif = nm != null && nm.areNotificationsEnabled();
                if (Build.VERSION.SDK_INT >= 33) notif = notif && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
                o.put("notifications", notif);
                AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
                o.put("exactAlarm", Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms()));
                o.put("fullScreen", Build.VERSION.SDK_INT < 34 || (nm != null && nm.canUseFullScreenIntent()));
                o.put("overlay", Settings.canDrawOverlays(c));
                PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
                o.put("battery", pm != null && pm.isIgnoringBatteryOptimizations(getPackageName()));
            } catch (Exception ignored) {}
            return o.toString();
        }

        @JavascriptInterface public void requestPermission(String which) {
            runOnUiThread(() -> {
                Uri pkg = Uri.parse("package:" + getPackageName());
                Intent i = null;
                switch (which) {
                    case "notifications":
                        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                                && shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
                            return;
                        }
                        i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                        break;
                    case "exactAlarm":
                        if (Build.VERSION.SDK_INT >= 31) i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg);
                        break;
                    case "fullScreen":
                        if (Build.VERSION.SDK_INT >= 34) i = new Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT", pkg);
                        break;
                    case "overlay":
                        i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pkg);
                        break;
                    case "battery":
                        i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg);
                        break;
                }
                if (i == null) i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg);
                try { startActivity(i); }
                catch (Exception e) {
                    try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)); } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface public void startVoice(String id) {
            runOnUiThread(() -> {
                voiceCb = id;
                Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SA");
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ar-SA");
                i.putExtra(RecognizerIntent.EXTRA_PROMPT, "تكلم... قل الموعد أو المصروف");
                i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                try { startActivityForResult(i, REQ_VOICE); }
                catch (ActivityNotFoundException e) {
                    sendVoice(id, null, "التعرف على الصوت مو متوفر. ثبّت تطبيق Google أو اكتب الجملة");
                    voiceCb = null;
                }
            });
        }

        @JavascriptInterface public void setSyncCredentials(String json) {
            AlarmStore.setCreds(c, json);
            if (AlarmStore.creds(c) != null) { SyncJobService.schedule(c); SyncJobService.runNow(c); }
            else SyncJobService.cancel(c);
        }

        @JavascriptInterface public String takeActions() { return AlarmStore.takeActions(c); }
    }
}
