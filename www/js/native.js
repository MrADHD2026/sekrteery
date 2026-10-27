/* سكرتيري — الجسر بين الواجهة وتطبيق أندرويد (ومع المتصفح لو بدون تطبيق) */
(function () {
  'use strict';
  const SK = window.SK = window.SK || {};
  const A = window.SKNative; // يحقنه تطبيق أندرويد
  const voiceCbs = {};
  let webTimers = [];

  const N = SK.native = {
    isApp: !!A,
    // ---- التنبيهات
    syncAlarms(list) {
      if (A) { try { A.syncAlarms(JSON.stringify(list)); } catch (e) { console.error(e); } return; }
      // في المتصفح: إشعارات عادية طالما الصفحة مفتوحة
      webTimers.forEach(clearTimeout); webTimers = [];
      const now = Date.now();
      list.filter(a => a.at - now < 864e5 * 2).forEach(a => {
        webTimers.push(setTimeout(() => N.webAlert(a), Math.max(0, a.at - now)));
      });
    },
    webAlert(a) {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(a.header + ': ' + a.title, { body: a.body, requireInteraction: a.strength !== 'normal', tag: a.key });
        }
      } catch (e) { }
      if (a.strength !== 'normal' && SK.app) SK.app.showWebAlarm(a);
    },
    notify(title, body) {
      if (A) { try { A.notify(title, body); } catch (e) { } return; }
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body }); } catch (e) { }
    },
    testAlarm(strength) {
      const a = { id: 'test', key: 'test:' + Date.now(), at: Date.now() + 10000, title: 'تجربة التنبيه', header: 'تنبيه تجريبي', body: 'هذا تنبيه تجريبي من سكرتيري', strength, level: strength === 'repeat' ? 'urgent' : 'important' };
      if (A) { A.testAlarm(JSON.stringify(a)); return; }
      setTimeout(() => N.webAlert(a), 10000);
    },
    // ---- الصلاحيات
    permissions() {
      if (A) { try { return JSON.parse(A.permissions()); } catch (e) { return {}; } }
      return { notifications: ('Notification' in window) ? Notification.permission === 'granted' : false };
    },
    requestPermission(which) {
      if (A) { A.requestPermission(which); return; }
      if (which === 'notifications' && 'Notification' in window) Notification.requestPermission().then(() => SK.app && SK.app.render());
    },
    // ---- الصوت
    voiceAvailable() { return !!A || !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
    startVoice(cb) {
      const id = 'v' + Date.now();
      voiceCbs[id] = cb;
      if (A) { A.startVoice(id); return; }
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) { cb(null, 'المتصفح ما يدعم التسجيل بالصوت، اكتب الجملة بدالها'); return; }
      const r = new R(); r.lang = 'ar-SA'; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = e => { const t = e.results[0][0].transcript; delete voiceCbs[id]; cb(t); };
      r.onerror = e => { delete voiceCbs[id]; cb(null, e.error === 'not-allowed' ? 'اسمح للمتصفح يستخدم المايكروفون' : 'ما قدرت أسمعك، جرب مرة ثانية أو اكتب'); };
      r.onend = () => { if (voiceCbs[id]) { delete voiceCbs[id]; cb(null, 'ما سمعت شي، جرب مرة ثانية'); } };
      r.start();
    },
    onVoice(id, text, err) { const cb = voiceCbs[id]; delete voiceCbs[id]; if (cb) cb(text || null, err || (text ? null : 'ما سمعت شي، جرب مرة ثانية أو اكتب')); },
    // ---- المزامنة في الخلفية (تطبيق أندرويد فقط)
    setSyncCredentials(o) { if (A) try { A.setSyncCredentials(JSON.stringify(o || {})); } catch (e) { } },
    // ---- الأوامر اللي سواها المستخدم من شاشة المنبه
    takeActions() { if (!A) return []; try { return JSON.parse(A.takeActions() || '[]'); } catch (e) { return []; } },
    calendars() { if (!A || !A.calendars) return []; try { return JSON.parse(A.calendars()); } catch (e) { return []; } },
    calUpsert(o) { if (!A || !A.calendarUpsert) return -1; try { return +A.calendarUpsert(JSON.stringify(o)); } catch (e) { return -1; } },
    calDelete(id) { if (A && A.calendarDelete && id > 0) try { A.calendarDelete(String(id)); } catch (e) { } },
    setConfig(o) { if (A && A.setConfig) try { A.setConfig(JSON.stringify(o || {})); } catch (e) { } },
    version() { if (A) try { return A.version(); } catch (e) { } return 'web'; }
  };
  window.SKBridge = Object.assign(window.SKBridge || {}, { onVoice: N.onVoice, onResume: () => SK.app && SK.app.onResume() });
})();
