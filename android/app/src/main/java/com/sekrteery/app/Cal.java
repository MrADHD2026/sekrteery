package com.sekrteery.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.TimeZone;

/** يضيف مواعيد سكرتيري لتقويم الجوال (تقويم جوجل المتزامن على الجوال). */
final class Cal {
    static final String MARK = "أضيف من سكرتيري";

    private Cal() {}

    static boolean hasPerm(Context c) {
        return c.checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
                && c.checkSelfPermission(Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED;
    }

    static JSONArray calendars(Context c) {
        JSONArray out = new JSONArray();
        if (!hasPerm(c)) return out;
        String[] proj = {CalendarContract.Calendars._ID, CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
                CalendarContract.Calendars.ACCOUNT_NAME, CalendarContract.Calendars.ACCOUNT_TYPE,
                CalendarContract.Calendars.CALENDAR_COLOR, CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL,
                CalendarContract.Calendars.VISIBLE, CalendarContract.Calendars.IS_PRIMARY};
        try (Cursor cur = c.getContentResolver().query(CalendarContract.Calendars.CONTENT_URI, proj, null, null, null)) {
            while (cur != null && cur.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("id", cur.getLong(0));
                o.put("name", cur.getString(1));
                o.put("account", cur.getString(2));
                o.put("type", cur.getString(3));
                o.put("color", String.format("#%06X", 0xFFFFFF & cur.getInt(4)));
                o.put("writable", cur.getInt(5) >= CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR);
                o.put("visible", cur.getInt(6) == 1);
                o.put("primary", !cur.isNull(7) && cur.getInt(7) == 1);
                o.put("google", "com.google".equals(cur.getString(3)));
                out.put(o);
            }
        } catch (Exception ignored) {}
        return out;
    }

    /** يضيف أو يحدّث موعد في التقويم. يرجّع رقم الحدث. */
    static long upsert(Context c, JSONObject e) {
        if (!hasPerm(c)) return -1;
        ContentResolver cr = c.getContentResolver();
        ContentValues v = new ContentValues();
        long begin = e.optLong("begin");
        long end = e.optLong("end", begin + 3600_000L);
        v.put(CalendarContract.Events.CALENDAR_ID, e.optLong("calId"));
        v.put(CalendarContract.Events.TITLE, e.optString("title"));
        v.put(CalendarContract.Events.DTSTART, begin);
        v.put(CalendarContract.Events.DTEND, end);
        v.put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().getID());
        v.put(CalendarContract.Events.EVENT_LOCATION, e.optString("location"));
        String note = e.optString("note");
        v.put(CalendarContract.Events.DESCRIPTION, (note.isEmpty() ? "" : note + "\n\n") + MARK);
        try {
            long id = e.optLong("eventId", -1);
            if (id > 0) {
                int n = cr.update(ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id), v, null, null);
                if (n > 0) return id;
            }
            Uri u = cr.insert(CalendarContract.Events.CONTENT_URI, v);
            return u == null ? -1 : ContentUris.parseId(u);
        } catch (Exception ex) {
            return -1;
        }
    }

    static void delete(Context c, long id) {
        if (!hasPerm(c) || id <= 0) return;
        try { c.getContentResolver().delete(ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id), null, null); } catch (Exception ignored) {}
    }

}
