/* سكرتيري — المزامنة بين الأجهزة عن طريق Firebase (اختياري) */
(function () {
  'use strict';
  const SK = window.SK = window.SK || {};
  const V = '10.12.2';
  const CFG_KEY = 'sk_fbconfig';
  let fb = null, auth = null, db = null, unsub = [], user = null, applyingRemote = false;

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('تعذر تحميل ' + src)); document.head.appendChild(s); });
  }
  const Y = SK.sync = {
    state: 'off', error: '', email: '',
    config() {
      try { return JSON.parse(localStorage.getItem(CFG_KEY) || 'null') || window.SK_FIREBASE_CONFIG || null; } catch (e) { return null; }
    },
    saveConfig(text) {
      // يقبل JSON أو الكود اللي يعطيك إياه Firebase (const firebaseConfig = {...})
      let t = String(text || '').trim();
      const m = t.match(/\{[\s\S]*\}/); if (m) t = m[0];
      t = t.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"').replace(/,\s*}/g, '}').replace(/""/g, '"');
      const cfg = JSON.parse(t);
      if (!cfg.apiKey || !cfg.projectId) throw new Error('الإعدادات ناقصة: لازم يكون فيها apiKey و projectId');
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
      return cfg;
    },
    clearConfig() { localStorage.removeItem(CFG_KEY); },
    async init() {
      const cfg = Y.config();
      if (!cfg) { Y.state = 'off'; return; }
      try {
        Y.state = 'loading';
        if (!window.firebase) {
          await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);
          await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`);
          await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
        }
        fb = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
        auth = firebase.auth(); db = firebase.firestore();
        try { db.enablePersistence({ synchronizeTabs: true }).catch(() => { }); } catch (e) { }
        auth.onAuthStateChanged(u => { user = u; if (u) Y.start(u); else { Y.stop(); Y.state = 'signedout'; SK.app && SK.app.render(); } });
      } catch (e) { Y.state = 'error'; Y.error = e.message; SK.app && SK.app.render(); }
    },
    async signIn(email, pass, create) {
      if (!auth) await Y.init();
      if (!auth) throw new Error('المزامنة غير مفعلة');
      if (create) await auth.createUserWithEmailAndPassword(email, pass);
      else await auth.signInWithEmailAndPassword(email, pass);
    },
    async signOut() { if (auth) await auth.signOut(); SK.native.setSyncCredentials(null); },
    async resetPassword(email) { if (!auth) await Y.init(); await auth.sendPasswordResetEmail(email); },
    col(name) { return db.collection('users').doc(user.uid).collection(name); },
    start(u) {
      Y.stop(); Y.state = 'on'; Y.email = u.email;
      const cfg = Y.config();
      SK.native.setSyncCredentials({ apiKey: cfg.apiKey, projectId: cfg.projectId, uid: u.uid, refreshToken: u.refreshToken });
      const S = SK.store;
      // نرفع اللي عندنا محلياً أول مرة
      const pushedKey = 'sk_pushed_' + u.uid;
      if (!localStorage.getItem(pushedKey)) {
        const batch = db.batch(); let n = 0;
        S.items.forEach(x => { batch.set(Y.col('items').doc(x.id), clean(x)); n++; });
        S.tx.forEach(x => { batch.set(Y.col('tx').doc(x.id), clean(x)); n++; });
        batch.set(Y.col('meta').doc('settings'), clean(S.settings));
        if (n < 450) batch.commit().then(() => localStorage.setItem(pushedKey, '1')).catch(e => console.warn(e));
        else { S.items.concat(S.tx).forEach(x => Y.push(S.items.includes(x) ? 'item' : 'tx', x)); localStorage.setItem(pushedKey, '1'); }
      }
      const listen = (name, kind) => Y.col(name).onSnapshot(snap => {
        let changed = false;
        snap.docChanges().forEach(ch => { if (ch.type !== 'removed' && S.mergeRemote(kind, ch.doc.data())) changed = true; });
        if (changed) { S.persist(); S.items.filter(i => i.done && i.repeat && i.repeat !== 'none' && !i.rolled && !i.deleted).forEach(i => S.rollRepeat(i)); S.emit('remote'); }
      }, e => { Y.state = 'error'; Y.error = e.message; SK.app && SK.app.render(); });
      unsub.push(listen('items', 'item'), listen('tx', 'tx'));
      unsub.push(Y.col('meta').doc('settings').onSnapshot(d => {
        const v = d.data(); if (v && (v.updatedAt || 0) > (S.settings.updatedAt || 0)) { Object.assign(S.settings, v); S.persist(); S.emit('remote'); }
      }));
      SK.app && SK.app.render();
    },
    stop() { unsub.forEach(f => { try { f(); } catch (e) { } }); unsub = []; },
    push(kind, doc) {
      if (!user || !db || applyingRemote) return;
      const name = kind === 'item' ? 'items' : kind === 'tx' ? 'tx' : null;
      if (kind === 'settings') { Y.col('meta').doc('settings').set(clean(doc)).catch(e => console.warn(e)); return; }
      if (name && doc && doc.id) Y.col(name).doc(doc.id).set(clean(doc)).catch(e => console.warn(e));
    }
  };
  function clean(o) { return JSON.parse(JSON.stringify(o)); }
})();
