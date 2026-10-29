/* سكرتيري — التخزين المحلي + الحسابات المشتركة */
(function () {
  'use strict';
  const SK = window.SK = window.SK || {};

  // ---------- أدوات ----------
  const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAY_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const pad = n => String(n).padStart(2, '0');
  const U = SK.util = {
    DAY_NAMES, DAY_SHORT, MONTHS,
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    startOfDay: t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); },
    addDays: (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); },
    startOfWeek: t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); },
    startOfMonth: t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); },
    endOfMonth: t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1, 1); return d.getTime(); },
    time: t => { const d = new Date(t); let h = d.getHours(); const ap = h < 12 ? 'ص' : 'م'; h = h % 12 || 12; return h + ':' + pad(d.getMinutes()) + ' ' + ap; },
    dateShort: t => { const d = new Date(t); return DAY_NAMES[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; },
    dayRel: t => {
      const s = U.startOfDay(t), today = U.startOfDay(Date.now());
      const diff = Math.round((s - today) / 864e5);
      if (diff === 0) return 'اليوم'; if (diff === 1) return 'بكرة'; if (diff === -1) return 'أمس';
      if (diff > 1 && diff < 7) return DAY_NAMES[new Date(t).getDay()];
      return U.dateShort(t);
    },
    money: (n, dec) => {
      const v = Math.round((+n || 0) * (dec ? 100 : 1)) / (dec ? 100 : 1);
      return v.toLocaleString('en-US', { maximumFractionDigits: dec ? 2 : 0 });
    },
    inputDate: t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    inputTime: t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    fromInputs: (ds, ts) => { const [y, m, d] = ds.split('-').map(Number); const [hh, mm] = (ts || '09:00').split(':').map(Number); return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).getTime(); }
  };

  SK.CURRENCY_NAMES = { SAR: 'ريال', USD: 'دولار', TRY: 'ليرة تركية', EUR: 'يورو', AED: 'درهم', EGP: 'جنيه' };
  SK.TYPE_NAMES = { appointment: 'موعد', task: 'مهمة', event: 'إيفنت' };
  SK.LEVEL_NAMES = { normal: 'عادي', important: 'مهم', urgent: 'عاجل' };
  SK.STRENGTH_NAMES = { normal: 'عادي', strong: 'قوي', repeat: 'قوي ومتكرر' };
  SK.LEVEL_STRENGTH = { normal: 'normal', important: 'strong', urgent: 'repeat' };
  SK.REPEAT_NAMES = { none: 'مرة وحدة', daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', custom: 'مخصص' };
  SK.KIND_NAMES = { expense: 'مصروف', income: 'دخل', deduction: 'خصم بنكي' };

  // ---------- التخزين ----------
  const K = { items: 'sk_items', tx: 'sk_tx', settings: 'sk_settings', trips: 'sk_trips' };
  function load(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('save failed', e); } }

  const DEFAULT_SETTINGS = {
    categories: (window.Parser ? Parser.DEFAULT_CATEGORIES : []).map(c => ({ id: c.id, name: c.name, kind: c.kind, words: c.words, budget: 0 })),
    rates: { SAR: 1, USD: 3.75, EUR: 4.3, TRY: 0.09, AED: 1.02, EGP: 0.077 },
    salaryDay: 27,
    defaultCurrency: 'SAR',
    lastTab: 'tasks',
    updatedAt: 0
  };

  const listeners = [];
  const S = SK.store = {
    items: load(K.items, []),
    trips: load(K.trips, []),
    tx: load(K.tx, []),
    settings: Object.assign({}, DEFAULT_SETTINGS, load(K.settings, {})),
    onChange(fn) { listeners.push(fn); },
    emit(kind, doc) { listeners.forEach(fn => { try { fn(kind, doc); } catch (e) { console.error(e); } }); },
    persist() { save(K.items, S.items); save(K.tx, S.tx); save(K.settings, S.settings); save(K.trips, S.trips); },

    // --- المواعيد والمهام
    activeItems() { return S.items.filter(i => !i.deleted); },
    getItem(id) { return S.items.find(i => i.id === id); },
    putItem(it, opts) {
      it.updatedAt = Date.now();
      if (!it.id) { it.id = U.uid(); it.createdAt = it.updatedAt; }
      it.nat = JSON.stringify(S.computeAlarms(it));
      const i = S.items.findIndex(x => x.id === it.id);
      if (i >= 0) S.items[i] = it; else S.items.push(it);
      S.persist(); if (!(opts && opts.silent)) S.emit('item', it);
      return it;
    },
    removeItem(id) { const it = S.getItem(id); if (!it) return; it.deleted = true; it.done = true; S.putItem(it); },
    completeItem(id, at) {
      const it = S.getItem(id); if (!it || it.done) return;
      it.done = true; it.doneAt = at || Date.now(); it.snoozeUntil = 0;
      S.putItem(it); S.rollRepeat(it);
    },
    snoozeItem(id, until) { const it = S.getItem(id); if (!it) return; it.snoozeUntil = until; S.putItem(it); },
    rescheduleItem(id, due) { const it = S.getItem(id); if (!it) return; it.due = due; it.done = false; it.snoozeUntil = 0; it.missedAck = false; S.putItem(it); },
    // الموعد الجاي حسب نوع التكرار
    nextDue(it, from) {
      const d = new Date(from);
      const r = it.rep || {};
      const rep = it.repeat;
      if (rep === 'daily') d.setDate(d.getDate() + 1);
      else if (rep === 'weekly') d.setDate(d.getDate() + 7);
      else if (rep === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (rep === 'custom') {
        const n = Math.max(1, +r.every || 1);
        if (r.unit === 'day') d.setDate(d.getDate() + n);
        else if (r.unit === 'month') d.setMonth(d.getMonth() + n);
        else {
          const days = (r.days || []).map(Number);
          if (!days.length) d.setDate(d.getDate() + 7 * n);
          else {
            // أول يوم مختار بعد هذا الموعد، في أسبوع من أسابيع الدورة
            const anchor = U.startOfWeek(r.anchor || it.due);
            for (let k = 1; k <= 7 * n + 7; k++) {
              const c = new Date(from); c.setDate(c.getDate() + k);
              const wk = Math.round((U.startOfWeek(c) - anchor) / (7 * 864e5));
              if (wk % n === 0 && days.includes(c.getDay())) return c.getTime();
            }
            d.setDate(d.getDate() + 7 * n);
          }
        }
      } else return null;
      return d.getTime();
    },
    // لو اختار أيام معينة والتاريخ مو منها: ننقله لأقرب يوم مختار
    normalizeRepeat(it) {
      if (it.repeat !== 'custom' || !it.rep) return it;
      it.rep.anchor = it.rep.anchor || it.due;
      const days = (it.rep.days || []).map(Number);
      if (it.rep.unit === 'week' && days.length && !days.includes(new Date(it.due).getDay())) {
        // أقرب يوم مختار، ومنه تبدأ الدورة
        for (let k = 1; k <= 7; k++) {
          const c = new Date(it.due); c.setDate(c.getDate() + k);
          if (days.includes(c.getDay())) { it.due = c.getTime(); break; }
        }
        it.rep.anchor = it.due;
      }
      return it;
    },
    repeatLabel(it) {
      if (it.repeat !== 'custom') return SK.REPEAT_NAMES[it.repeat || 'none'];
      const r = it.rep || {}; const n = +r.every || 1;
      const unit = r.unit === 'day' ? (n === 1 ? 'كل يوم' : n === 2 ? 'كل يومين' : `كل ${n} أيام`)
        : r.unit === 'month' ? (n === 1 ? 'كل شهر' : n === 2 ? 'كل شهرين' : `كل ${n} شهور`)
        : (n === 1 ? 'كل أسبوع' : n === 2 ? 'كل أسبوعين' : `كل ${n} أسابيع`);
      const days = r.unit === 'week' && r.days && r.days.length ? ': ' + r.days.map(x => U.DAY_NAMES[x]).join('، ') : '';
      return unit + days;
    },
    rollRepeat(it) {
      // ينشئ الموعد الجاي للمتكرر
      if (!it.repeat || it.repeat === 'none' || it.rolled || it.deleted) return;
      let t = S.nextDue(it, it.due);
      if (t == null) return;
      let guard = 0;
      while (t < Date.now() - 864e5 && guard++ < 500) t = S.nextDue(it, t); // لو فات أكثر من دورة
      it.rolled = true; S.putItem(it, { silent: true });
      const next = Object.assign({}, it, { id: null, done: false, doneAt: 0, rolled: false, snoozeUntil: 0, due: t, missedAck: false, calEventId: 0 });
      S.putItem(next);
    },
    strengthOf(it) { return it.strength || SK.LEVEL_STRENGTH[it.level || 'normal']; },
    computeAlarms(it) {
      // قائمة التنبيهات اللي يرسلها للجوال
      if (it.done || it.deleted) return [];
      const out = [];
      const strength = S.strengthOf(it);
      const before = +it.before || 0;
      const typeName = SK.TYPE_NAMES[it.type] || 'تذكير';
      const when = (it.timeSet !== false ? U.time(it.due) : '');
      const base = { id: it.id, title: it.title, level: it.level || 'normal' };
      if (it.snoozeUntil && it.snoozeUntil > Date.now() - 6e4) {
        out.push(Object.assign({}, base, { key: it.id + ':s', at: it.snoozeUntil, strength, header: 'تذكير مؤجَّل', body: typeName + (when ? ' الساعة ' + when : '') }));
        return out;
      }
      // موعد له مكان: الجوال يحسب وقت الطريق من موقعك ويطلع "اطلع الحين" في وقته
      if (it.place && it.place.lat != null && it.due > Date.now()) {
        out.push(Object.assign({}, base, {
          key: it.id + ':trv', kind: 'travel', at: it.due - 3 * 3600e3, due: it.due, strength: strength === 'normal' ? 'strong' : strength,
          lat: it.place.lat, lng: it.place.lng, place: it.place.name || '', buffer: it.leaveBuffer != null ? +it.leaveBuffer : 15,
          header: 'اطلع الحين', body: typeName + ' الساعة ' + U.time(it.due) + (it.place.name ? ' · ' + it.place.name : '')
        }));
      }
      if (before > 0) {
        const leave = (it.type === 'appointment' || it.type === 'event') && !(it.place && it.place.lat != null);
        out.push(Object.assign({}, base, {
          key: it.id + ':pre', at: it.due - before * 6e4, strength,
          header: leave ? 'اطلع الحين' : 'باقي ' + beforeText(before),
          body: typeName + ' الساعة ' + U.time(it.due) + (leave ? ' · باقي ' + beforeText(before) : '')
        }));
        out.push(Object.assign({}, base, { key: it.id + ':due', at: it.due, strength: strength === 'repeat' ? 'strong' : 'normal', header: 'حان ' + (it.type === 'task' ? 'وقت المهمة' : 'الموعد'), body: typeName + ' الساعة ' + U.time(it.due) }));
      } else {
        out.push(Object.assign({}, base, { key: it.id + ':due', at: it.due, strength, header: it.type === 'task' ? 'وقت المهمة' : 'حان الموعد', body: typeName + (when ? ' الساعة ' + when : '') }));
      }
      return out;
    },
    upcomingAlarms() {
      const now = Date.now() - 6e4;
      const out = [];
      S.activeItems().forEach(it => { try { JSON.parse(it.nat || '[]').forEach(a => { if ((a.kind === 'travel' ? a.due : a.at) > now) out.push(a); }); } catch (e) { } });
      return out.sort((a, b) => a.at - b.at).slice(0, 200);
    },

    // --- المالية
    activeTx() { return S.tx.filter(t => !t.deleted); },
    getTx(id) { return S.tx.find(t => t.id === id); },
    toSar(amount, cur) { return (+amount || 0) * (S.settings.rates[cur] || 1); },
    putTx(t) {
      t.updatedAt = Date.now();
      if (!t.id) { t.id = U.uid(); t.createdAt = t.updatedAt; }
      t.sar = Math.round(S.toSar(t.amount, t.currency) * 100) / 100;
      const i = S.tx.findIndex(x => x.id === t.id);
      if (i >= 0) S.tx[i] = t; else S.tx.push(t);
      S.persist(); S.emit('tx', t);
      return t;
    },
    removeTx(id) { const t = S.getTx(id); if (!t) return; t.deleted = true; S.putTx(t); },
    category(id) { return S.settings.categories.find(c => c.id === id) || { id: 'other', name: 'أخرى', kind: 'expense' }; },
    putSettings(patch) { Object.assign(S.settings, patch); S.settings.updatedAt = Date.now(); S.persist(); S.emit('settings', S.settings); },

    // --- السفر
    activeTrips() { return S.trips.filter(t => !t.deleted); },
    getTrip(id) { return S.trips.find(t => t.id === id); },
    putTrip(t) {
      t.updatedAt = Date.now();
      if (!t.id) { t.id = U.uid(); t.createdAt = t.updatedAt; }
      const i = S.trips.findIndex(x => x.id === t.id);
      if (i >= 0) S.trips[i] = t; else S.trips.push(t);
      S.persist(); S.emit('trip', t);
      return t;
    },
    removeTrip(id) {
      const t = S.getTrip(id); if (!t) return;
      t.deleted = true; S.putTrip(t);
      S.items.filter(i => i.tripId === id && !i.deleted).forEach(i => S.removeItem(i.id));
    },
    tripTx(id) { return S.activeTx().filter(t => t.tripId === id); },

    // ملخص فترة
    summary(from, to) {
      const list = S.activeTx().filter(t => !t.tripId && t.date >= from && t.date < to);
      let income = 0, out = 0; const byCat = {};
      list.forEach(t => {
        if (t.kind === 'income') income += t.sar;
        else { out += t.sar; byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.sar; }
      });
      return { list, income, out, remaining: income - out, byCat };
    },

    // --- المزامنة: دمج نسخة جاية من السحابة
    mergeRemote(kind, doc) {
      const arr = kind === 'item' ? S.items : kind === 'trip' ? S.trips : S.tx;
      const i = arr.findIndex(x => x.id === doc.id);
      if (i >= 0 && (arr[i].updatedAt || 0) >= (doc.updatedAt || 0)) return false;
      if (i >= 0) arr[i] = doc; else arr.push(doc);
      return true;
    },
    exportAll() { return JSON.stringify({ v: 1, at: Date.now(), items: S.items, tx: S.tx, trips: S.trips, settings: S.settings }); },
    importAll(json) {
      const d = JSON.parse(json);
      (d.items || []).forEach(x => S.mergeRemote('item', x));
      (d.tx || []).forEach(x => S.mergeRemote('tx', x));
      (d.trips || []).forEach(x => S.mergeRemote('trip', x));
      if (d.settings) Object.assign(S.settings, d.settings);
      S.persist(); S.emit('import');
    }
  };
  function beforeText(m) {
    if (m >= 1440) return m === 1440 ? 'يوم' : Math.round(m / 1440) + ' أيام';
    if (m >= 60) return m === 60 ? 'ساعة' : m === 120 ? 'ساعتين' : (m / 60) + ' ساعات';
    return m + ' دقيقة';
  }
  SK.beforeText = beforeText;

  // ضمان وجود كل البنود الافتراضية (لو أضفنا بنود جديدة في تحديث)
  if (window.Parser) {
    Parser.DEFAULT_CATEGORIES.forEach(c => {
      if (!S.settings.categories.some(x => x.id === c.id)) S.settings.categories.push({ id: c.id, name: c.name, kind: c.kind, words: c.words, budget: 0 });
    });
  }
})();
