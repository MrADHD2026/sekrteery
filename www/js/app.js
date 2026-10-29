/* سكرتيري — الواجهة */
(function () {
  'use strict';
  const SK = window.SK;
  const S = SK.store, U = SK.util, N = SK.native, esc = U.esc;
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));

  // ---------- أيقونات ----------
  const I = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    chevL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/></svg>'
  };

  // ---------- الحالة ----------
  const st = {
    taskPeriod: 'week', moneyPeriod: 'month', moneyOffset: 0, showAllTx: false,
    voice: { text: '', listening: false, err: '', drafts: [] }, mode: 'voice', sheet: null
  };

  function route() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const [path, q] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = {}; (q || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); params[k] = decodeURIComponent(v || ''); });
    return { parts, params, name: parts[0] || S.settings.lastTab || 'tasks' };
  }
  const go = (h) => { location.hash = h; };

  // ---------- عناصر مشتركة ----------
  const badge = (cls, txt) => `<span class="badge ${cls}">${esc(txt)}</span>`;
  const levelBadge = (lv) => badge('lv-' + (lv || 'normal'), SK.LEVEL_NAMES[lv || 'normal']);
  const typeBadge = (t) => badge('ty-' + t, SK.TYPE_NAMES[t] || t);
  function chips(group, options, value, extra) {
    return `<div class="chips ${extra || ''}" role="group" data-group="${group}">${options.map(o => `<button type="button" class="chip ${o.cls || ''}" data-act="chip" data-group="${group}" data-val="${esc(o.v)}" aria-pressed="${String(o.v) === String(value)}">${esc(o.t)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('')}</div>`;
  }
  const chipVal = (root, group) => { const b = $(`.chip[data-group="${group}"][aria-pressed="true"]`, root); return b ? b.dataset.val : null; };
  function toast(msg, kind) {
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  function header(title, back) {
    return `<header class="top">
      ${back ? `<a class="icon-btn" href="${back}" aria-label="رجوع">${I.x}</a>` : `<a class="icon-btn" href="#/settings" aria-label="الإعدادات">${I.gear}</a>`}
      <h1>${esc(title)}</h1>
      ${back ? '<span class="icon-spacer"></span>' : syncDot()}
    </header>`;
  }
  function syncDot() {
    const s = SK.sync.state;
    const label = s === 'on' ? 'متزامن' : s === 'loading' ? 'جاري الاتصال' : s === 'error' ? 'خطأ في المزامنة' : 'على هذا الجهاز فقط';
    return `<a class="sync-pill ${s}" href="#/settings" title="${label}">${I.cloud}<span>${label}</span></a>`;
  }
  function tabs(active) {
    return `<nav class="seg" aria-label="الأقسام">
      <a href="#/tasks" class="${active === 'tasks' ? 'on' : ''}" aria-current="${active === 'tasks' ? 'page' : 'false'}">المهام والمواعيد</a>
      <a href="#/money" class="${active === 'money' ? 'on' : ''}" aria-current="${active === 'money' ? 'page' : 'false'}">المالية</a>
      <a href="#/travel" class="${active === 'travel' ? 'on' : ''}" aria-current="${active === 'travel' ? 'page' : 'false'}">السفر</a>
    </nav>`;
  }

  // ================= داشبورد المهام =================
  const GRACE = 15 * 6e4;
  const isMissed = (it, now) => !it.done && !it.deleted && it.due < now - GRACE;
  function periodRange(p, now) {
    if (p === 'day') return [U.startOfDay(now), U.addDays(U.startOfDay(now), 1)];
    if (p === 'month') return [U.startOfMonth(now), U.endOfMonth(now)];
    const s = U.startOfWeek(now); return [s, U.addDays(s, 7)];
  }
  function itemRow(it, opts) {
    const now = Date.now();
    const missed = isMissed(it, now);
    const meta = [SK.TYPE_NAMES[it.type], SK.LEVEL_NAMES[it.level || 'normal'], opts && opts.showDay ? U.dayRel(it.due) : null, it.repeat && it.repeat !== 'none' ? S.repeatLabel(it) : null, it.money ? 'مرتبطة بالمالية' : null, it.place ? '📍 ' + it.place.name : null, it.tripId && SK.travel ? '✈️ ' + SK.travel.tripName(it.tripId) : null].filter(Boolean).join(' · ');
    return `<div class="row-item ${it.done ? 'done' : ''} lvl-${it.level || 'normal'}">
      <button type="button" class="tick" data-act="toggle-done" data-id="${it.id}" aria-label="${it.done ? 'رجّعها غير منجزة' : 'تم'}" aria-pressed="${!!it.done}">${I.check}</button>
      <a class="row-main" href="#/task/${it.id}">
        <span class="row-time">${it.timeSet !== false ? U.time(it.due) : 'بدون وقت'}</span>
        <span class="row-title">${esc(it.title)}</span>
        <span class="row-meta ${missed ? 'red' : ''}">${esc(meta)}</span>
      </a>
    </div>`;
  }
  function viewTasks() {
    const now = Date.now();
    const items = S.activeItems();
    const [from, to] = periodRange(st.taskPeriod, now);
    const inP = items.filter(i => i.due >= from && i.due < to);
    const doneN = items.filter(i => i.done && (i.doneAt || i.due) >= from && (i.doneAt || i.due) < to).length;
    const missedP = inP.filter(i => isMissed(i, now)).length;
    const today0 = U.startOfDay(now), today1 = U.addDays(today0, 1);
    const todayList = items.filter(i => i.due >= today0 && i.due < today1).sort((a, b) => a.due - b.due);
    const leftToday = todayList.filter(i => !i.done).length;
    const missedList = items.filter(i => isMissed(i, now) && !i.missedAck && i.due > now - 30 * 864e5).sort((a, b) => b.due - a.due);
    const upcoming = items.filter(i => !i.done && i.due >= today1 && i.due < U.addDays(today1, 14)).sort((a, b) => a.due - b.due).slice(0, 12);

    // الرسم الأسبوعي
    const w0 = U.startOfWeek(now);
    const bars = [0, 1, 2, 3, 4, 5, 6].map(d => {
      const a = U.addDays(w0, d), b = U.addDays(w0, d + 1);
      const list = items.filter(i => i.due >= a && i.due < b);
      const done = list.filter(i => i.done).length;
      const pct = list.length ? Math.round(done / list.length * 100) : 0;
      return { pct, n: list.length, done, future: a > now, today: a === today0, label: U.DAY_SHORT[d] };
    });

    const perms = N.isApp ? N.permissions() : null;
    const permMissing = !!perms && (['notifications', 'exactAlarm', 'fullScreen', 'overlay', 'battery'].some(k => perms[k] === false) || ((perms.location === false || perms.bgLocation === false) && S.activeItems().some(i => i.place && !i.done)));

    return `${header('سكرتيري')}
    <main class="wrap">
      ${tabs('tasks')}
      ${permMissing ? `<a class="banner warn" href="#/settings">${I.warn}<span><b>التنبيه القوي يحتاج صلاحيات.</b> اضغط هنا وفعّلها عشان تطلع لك الشاشة الكاملة.</span></a>` : ''}
      ${chips('taskPeriod', [{ v: 'day', t: 'اليوم' }, { v: 'week', t: 'هالأسبوع' }, { v: 'month', t: 'هالشهر' }], st.taskPeriod, 'small-chips')}
      <section class="stats3">
        <div class="stat"><b class="teal">${doneN}</b><span>أنجزتها</span></div>
        <div class="stat"><b class="red">${missedP}</b><span>فلتت منك</span></div>
        <div class="stat"><b>${leftToday}</b><span>باقي اليوم</span></div>
      </section>
      <div class="grid">
      ${missedList.length ? `<section class="card">
        <h2 class="red">فلتت منك</h2>
        ${missedList.map(it => `<div class="missed">
          <a class="row-main" href="#/task/${it.id}"><span class="row-title">${esc(it.title)}</span><span class="row-meta ${it.level === 'urgent' ? 'red' : ''}">${esc(SK.TYPE_NAMES[it.type])} · ${esc(SK.LEVEL_NAMES[it.level || 'normal'])} · ${esc(U.dayRel(it.due))} ${it.timeSet !== false ? esc(U.time(it.due)) : ''}</span></a>
          <div class="missed-acts">
            <button type="button" class="btn-sm" data-act="toggle-done" data-id="${it.id}">تم</button>
            <button type="button" class="btn-sm outline" data-act="resched" data-id="${it.id}">أعد جدولتها</button>
            <button type="button" class="btn-icon" data-act="ack-missed" data-id="${it.id}" aria-label="شيلها من القائمة">${I.x}</button>
          </div>
        </div>`).join('')}
      </section>` : ''}
      <section class="card">
        <h2>اليوم <small>${esc(U.dateShort(now))}</small></h2>
        ${todayList.length ? todayList.map(it => itemRow(it)).join('') : '<p class="empty">ما عندك شي اليوم. اضغط الزر تحت وأضف بصوتك.</p>'}
      </section>
      ${upcoming.length ? `<section class="card"><h2>القادم</h2>${upcoming.map(it => itemRow(it, { showDay: true })).join('')}</section>` : ''}
      <section class="card">
        <h2>نسبة الإنجاز هالأسبوع</h2>
        <div class="bars" role="img" aria-label="نسبة الإنجاز لكل يوم">
          ${bars.map(b => `<div class="bar-col ${b.today ? 'today' : ''}"><div class="bar-val">${b.n ? b.pct + '%' : ''}</div><div class="bar ${b.future ? 'future' : ''}" style="height:${b.n ? Math.max(6, b.pct) : 4}%"></div><span>${b.label}</span></div>`).join('')}
        </div>
      </section>
      </div>
    </main>
    <div class="bottom">
      <a class="btn primary big" href="#/task/new?mode=voice&auto=1">${I.mic}<span>أضف موعد أو مهمة</span></a>
      <a class="btn ghost" href="#/task/new?mode=manual">يدوي</a>
    </div>`;
  }

  // ================= داشبورد المالية =================
  function moneyRange() {
    const now = new Date();
    if (st.moneyPeriod === 'week') {
      const s = U.addDays(U.startOfWeek(now), st.moneyOffset * 7);
      return { from: s, to: U.addDays(s, 7), label: `${new Date(s).getDate()} ${U.MONTHS[new Date(s).getMonth()]} – ${new Date(U.addDays(s, 6)).getDate()} ${U.MONTHS[new Date(U.addDays(s, 6)).getMonth()]}` };
    }
    const d = new Date(now.getFullYear(), now.getMonth() + st.moneyOffset, 1);
    return { from: d.getTime(), to: U.endOfMonth(d), label: U.MONTHS[d.getMonth()] + ' ' + d.getFullYear() };
  }
  function txRow(t) {
    const c = S.category(t.categoryId);
    const sign = t.kind === 'income' ? '+' : '-';
    const orig = t.currency !== 'SAR' ? `${U.money(t.amount, true)} ${SK.CURRENCY_NAMES[t.currency] || t.currency} · ` : '';
    return `<a class="tx" href="#/tx/${t.id}">
      <span class="tx-main"><b>${esc(t.title || c.name)}</b><small>${esc(orig)}${esc(SK.KIND_NAMES[t.kind])} · ${esc(c.name)} · ${esc(U.dayRel(t.date))}</small></span>
      <b class="tx-amt ${t.kind === 'income' ? 'teal' : ''}">${sign}${U.money(t.sar)}</b>
    </a>`;
  }
  function viewMoney() {
    const r = moneyRange();
    const sm = S.summary(r.from, r.to);
    const monthNow = S.summary(U.startOfMonth(Date.now()), U.endOfMonth(Date.now()));
    const cats = S.settings.categories.filter(c => c.kind !== 'income');
    const ranked = Object.keys(sm.byCat).map(id => ({ c: S.category(id), v: sm.byCat[id] })).sort((a, b) => b.v - a.v);
    const max = ranked.length ? ranked[0].v : 1;
    const pct = sm.income > 0 ? Math.min(100, Math.round(sm.out / sm.income * 100)) : (sm.out > 0 ? 100 : 0);
    // تحذيرات الميزانية (للشهر الحالي)
    const warns = cats.filter(c => c.budget > 0 && (monthNow.byCat[c.id] || 0) >= c.budget * 0.75).map(c => {
      const used = Math.round((monthNow.byCat[c.id] || 0) / c.budget * 100);
      return used >= 100 ? `تجاوزت ميزانية <b>${esc(c.name)}</b> (${used}%)` : `صرفت ${used}% من ميزانية <b>${esc(c.name)}</b>`;
    });
    const today = new Date(); const sd = +S.settings.salaryDay || 0;
    let daysToSalary = null;
    if (sd) { let nx = new Date(today.getFullYear(), today.getMonth(), sd); if (nx.getTime() < U.startOfDay(today)) nx = new Date(today.getFullYear(), today.getMonth() + 1, sd); daysToSalary = Math.round((nx.getTime() - U.startOfDay(today)) / 864e5); }
    const list = sm.list.slice().sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
    const shown = st.showAllTx ? list : list.slice(0, 6);

    return `${header('سكرتيري')}
    <main class="wrap">
      ${tabs('money')}
      <div class="period-nav">
        ${chips('moneyPeriod', [{ v: 'month', t: 'شهري' }, { v: 'week', t: 'أسبوعي' }], st.moneyPeriod, 'small-chips')}
        <div class="pager">
          <button type="button" class="icon-btn" data-act="money-prev" aria-label="السابق">${I.chevR}</button>
          <b>${esc(r.label)}</b>
          <button type="button" class="icon-btn" data-act="money-next" aria-label="التالي" ${st.moneyOffset >= 0 ? 'disabled' : ''}>${I.chevL}</button>
        </div>
      </div>
      <div class="grid">
      <section class="card dark">
        <span class="muted-l">${sm.income > 0 ? 'المتبقي لك' : 'المصروف'} ${st.moneyPeriod === 'week' ? 'هالأسبوع' : 'هالشهر'}</span>
        <div class="big-num">${U.money(sm.income > 0 ? sm.remaining : sm.out)} <small>ر.س</small></div>
        <div class="meter"><div style="width:${pct}%" class="${pct >= 90 ? 'hot' : ''}"></div></div>
        <div class="two">
          <div><span class="muted-l">الدخل</span><b>${U.money(sm.income)}</b></div>
          <div><span class="muted-l">المصروف والخصومات</span><b>${U.money(sm.out)}</b></div>
        </div>
        ${sm.income <= 0 ? '<span class="muted-l small">ما سجلت دخل في هالفترة. قل مثلاً: "استلمت الراتب عشرة آلاف"</span>' : ''}
      </section>
      ${SK.travel && SK.travel.shareIn(r.from, r.to) > 0 ? `<a class="banner teal" href="#/travel">✈️<span>مصاريف السفر في هالفترة (حصتك): <b>${U.money(SK.travel.shareIn(r.from, r.to))} ر.س</b>. منفصلة عن ميزانيتك هنا.</span></a>` : ''}
      ${(warns.length || daysToSalary != null) ? `<section class="banner orange">${I.warn}<span>${warns.length ? '<b>انتبه:</b> ' + warns.join('، ') + '. ' : ''}${daysToSalary != null ? `${daysToSalary === 0 ? 'الراتب ينزل اليوم!' : 'باقي على الراتب ' + (daysToSalary === 1 ? 'يوم واحد' : daysToSalary === 2 ? 'يومين' : daysToSalary + ' ' + (daysToSalary <= 10 ? 'أيام' : 'يوم'))}.` : ''}</span></section>` : ''}
      <section class="card">
        <h2>أكثر البنود صرفاً</h2>
        ${ranked.length ? ranked.map(x => {
          const b = x.c.budget > 0 && st.moneyPeriod === 'month';
          const w = b ? Math.min(100, x.v / x.c.budget * 100) : x.v / max * 100;
          return `<div class="catbar"><div class="catbar-h"><span>${esc(x.c.name)}</span><b>${U.money(x.v)}${b ? ` <small>من ${U.money(x.c.budget)}</small>` : ''}</b></div><div class="track"><div style="width:${Math.max(2, w)}%" class="${b && w >= 100 ? 'over' : b && w >= 75 ? 'near' : ''}"></div></div></div>`;
        }).join('') : '<p class="empty">ما فيه مصروفات مسجلة في هالفترة.</p>'}
        <small class="muted">المبالغ بالريال · العملات الثانية محوّلة بالأسعار اللي في الإعدادات</small>
      </section>
      <section class="card">
        <h2>العمليات <small>${list.length}</small></h2>
        ${shown.length ? shown.map(txRow).join('') : '<p class="empty">ما فيه عمليات.</p>'}
        ${list.length > 6 ? `<button type="button" class="btn-link" data-act="toggle-alltx">${st.showAllTx ? 'أقل' : 'عرض الكل'}</button>` : ''}
      </section>
      </div>
    </main>
    <div class="bottom">
      <a class="btn primary big" href="#/tx/new?mode=voice&auto=1">${I.mic}<span>سجّل مصروف أو دخل</span></a>
      <a class="btn ghost" href="#/tx/new?mode=manual">يدوي</a>
    </div>`;
  }

  // ================= نماذج الإدخال =================
  const BEFORE_OPTS = [0, 5, 10, 15, 30, 45, 60, 90, 120, 180, 1440];
  function taskForm(it) {
    it = it || {};
    const due = it.due || (() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d.getTime(); })();
    const level = it.level || 'normal';
    const strength = it.strength || SK.LEVEL_STRENGTH[level];
    const cats = S.settings.categories.filter(c => c.kind !== 'income');
    return `<form class="form" data-form="task" onsubmit="return false">
      ${it.tripId ? `<input type="hidden" name="tripId" value="${esc(it.tripId)}"><div class="field"><span class="lbl">✈️ ${esc(SK.travel.tripName(it.tripId))}</span>${chips('tripKind', Object.keys(SK.travel.KINDS).map(k => ({ v: k, t: SK.travel.KINDS[k].icon + ' ' + SK.travel.KINDS[k].name })), it.tripKind || 'activity')}</div>` : ''}
      <div class="field"><span class="lbl">النوع</span>${chips('type', [{ v: 'appointment', t: 'موعد' }, { v: 'task', t: 'مهمة' }, { v: 'event', t: 'إيفنت' }], it.type || 'task')}</div>
      <div class="field"><span class="lbl">درجة الأهمية</span>${chips('level', [{ v: 'normal', t: 'عادي', sub: 'إشعار', cls: 'lv-n' }, { v: 'important', t: 'مهم', sub: 'شاشة كاملة', cls: 'lv-i' }, { v: 'urgent', t: 'عاجل', sub: 'كاملة ومتكررة', cls: 'lv-u' }], level, 'tall')}
        <small class="muted">الأهمية تحدد قوة التنبيه تلقائياً، وتقدر تغيرها تحت</small></div>
      <label class="field"><span class="lbl">العنوان</span><input name="title" type="text" value="${esc(it.title || '')}" placeholder="مثلاً: موعد المستشفى" required></label>
      <div class="two">
        <label class="field"><span class="lbl">التاريخ</span><input name="date" type="date" value="${U.inputDate(due)}"></label>
        <label class="field"><span class="lbl">الوقت</span><input name="time" type="time" value="${it.timeSet === false ? '' : U.inputTime(due)}"></label>
      </div>
      <div class="two">
        <label class="field"><span class="lbl">نبهني قبل</span><select name="before">${BEFORE_OPTS.map(m => `<option value="${m}" ${(+it.before || 0) === m ? 'selected' : ''}>${m ? SK.beforeText(m) : 'في الوقت نفسه'}</option>`).join('')}</select></label>
        <label class="field"><span class="lbl">التكرار</span><select name="repeat" data-change="repeat">${Object.keys(SK.REPEAT_NAMES).map(k => `<option value="${k}" ${(it.repeat || 'none') === k ? 'selected' : ''}>${k === 'custom' ? 'مخصص (أنت تحدد)' : SK.REPEAT_NAMES[k]}${k === 'monthly' ? ' (مثل الفواتير)' : ''}</option>`).join('')}</select></label>
      </div>
      <div class="custom-rep" data-slot="customRep" ${it.repeat === 'custom' ? '' : 'hidden'}>
        <div class="rep-row"><span>كل</span><input name="repEvery" type="number" min="1" max="99" inputmode="numeric" value="${(it.rep && it.rep.every) || 1}" aria-label="كل كم">
          <select name="repUnit" data-change="repUnit" aria-label="الوحدة">${[['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر']].map(([v, t]) => `<option value="${v}" ${((it.rep && it.rep.unit) || 'week') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div data-slot="repDays" ${((it.rep && it.rep.unit) || 'week') === 'week' ? '' : 'hidden'}>
          <span class="lbl">في أيام (اختر يوم أو أكثر)</span>
          <div class="chips days-chips" role="group">${U.DAY_SHORT.map((dn, k) => `<button type="button" class="chip" data-act="toggle-day" data-day="${k}" aria-pressed="${!!(it.rep && it.rep.days && it.rep.days.map(Number).includes(k))}">${dn}</button>`).join('')}</div>
        </div>
        <small class="muted">مثلاً: "كل 2 أسبوع" يعني كل أسبوعين. و"كل 1 أسبوع" مع أحد واثنين يعني كل أحد واثنين.</small>
      </div>
      <div class="field"><span class="lbl">المكان (اختياري)</span>
        <input type="hidden" name="plat" value="${it.place ? it.place.lat : ''}"><input type="hidden" name="plng" value="${it.place ? it.place.lng : ''}"><input type="hidden" name="pname" value="${esc(it.place ? it.place.name : '')}">
        <div data-slot="place">${placeChip(it.place)}</div>
        <small class="muted">لو حددت المكان، الجوال يحسب وقت الطريق من موقعك ويطلع لك "اطلع الحين" في وقته</small>
      </div>
      <label class="field"><span class="lbl">"اطلع الحين" قبل الموعد بـ</span><select name="leaveBuffer">${[5, 10, 15, 20, 30].map(m => `<option value="${m}" ${(it.leaveBuffer != null ? +it.leaveBuffer : 15) === m ? 'selected' : ''}>${m} دقيقة زيادة على وقت الطريق</option>`).join('')}</select></label>
      <div class="field"><span class="lbl">قوة التنبيه</span>${chips('strength', [{ v: 'normal', t: 'عادي' }, { v: 'strong', t: 'قوي' }, { v: 'repeat', t: 'قوي ومتكرر', cls: 'red-on' }], strength)}</div>
      <label class="field"><span class="lbl">مرتبطة بالمالية؟</span><select name="money"><option value="">لا</option>${cats.map(c => `<option value="${c.id}" ${it.money === c.id ? 'selected' : ''}>نعم، لما أخلصها سجّلها في: ${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field"><span class="lbl">ملاحظة (اختياري)</span><input name="note" type="text" value="${esc(it.note || '')}" placeholder="مثلاً: خذ الأوراق معك"></label>
    </form>`;
  }
  function placeChip(p) {
    if (!p || p.lat == null) return `<button type="button" class="btn-sm outline" data-act="place-open">${I.pin} حدد المكان</button>`;
    return `<div class="place-chip">${I.pin}<span class="grow"><b>${esc(p.name || 'المكان')}</b><small data-slot="eta">${p.eta ? esc(p.eta) : ''}</small></span>
      <button type="button" class="btn-sm outline" data-act="place-open">تغيير</button><button type="button" class="btn-icon" data-act="place-clear" aria-label="شيل المكان">${I.x}</button></div>`;
  }
  function readTaskForm(root, base) {
    const f = $('form[data-form="task"]', root);
    const title = f.title.value.trim();
    if (!title) { toast('اكتب العنوان', 'err'); f.title.focus(); return null; }
    const ts = f.time.value;
    return S.normalizeRepeat(Object.assign({}, base || {}, {
      type: chipVal(f, 'type') || 'task', level: chipVal(f, 'level') || 'normal', strength: chipVal(f, 'strength') || 'normal',
      title, due: U.fromInputs(f.date.value || U.inputDate(Date.now()), ts || '09:00'), timeSet: !!ts,
      before: +f.before.value || 0, repeat: f.repeat.value,
      rep: f.repeat.value === 'custom' ? { every: Math.max(1, +f.repEvery.value || 1), unit: f.repUnit.value, days: f.repUnit.value === 'week' ? $$('[data-act="toggle-day"][aria-pressed="true"]', f).map(b => +b.dataset.day) : [], anchor: (base && base.rep && base.rep.anchor) || null } : null, money: f.money.value || null, note: f.note.value.trim(),
      place: f.plat.value ? { lat: +f.plat.value, lng: +f.plng.value, name: f.pname.value } : null,
      leaveBuffer: +f.leaveBuffer.value || 15,
      tripId: f.tripId ? f.tripId.value : (base && base.tripId) || null,
      tripKind: f.tripId ? (chipVal(f, 'tripKind') || 'activity') : (base && base.tripKind) || null
    }));
  }
  function catChips(kind, value) {
    const cats = S.settings.categories.filter(c => kind === 'income' ? c.kind === 'income' : c.kind !== 'income');
    const v = cats.some(c => c.id === value) ? value : (kind === 'deduction' ? 'loans' : cats[0] && cats[0].id);
    return chips('cat', cats.map(c => ({ v: c.id, t: c.name })).concat([{ v: '__new', t: '+ بند جديد', cls: 'dashed' }]), v, 'wrap3');
  }
  function txForm(t) {
    t = t || {};
    const kind = t.kind || 'expense';
    return `<form class="form" data-form="tx" onsubmit="return false">
      <div class="field"><span class="lbl">النوع</span>${chips('kind', [{ v: 'expense', t: 'مصروف' }, { v: 'income', t: 'دخل' }, { v: 'deduction', t: 'خصم بنكي' }], kind)}</div>
      <div class="two amt">
        <label class="field"><span class="lbl">المبلغ</span><input name="amount" type="text" inputmode="decimal" value="${t.amount != null ? esc(t.amount) : ''}" placeholder="200" required></label>
        <label class="field"><span class="lbl">العملة</span><select name="currency">${Object.keys(SK.CURRENCY_NAMES).map(c => `<option value="${c}" ${(t.currency || S.settings.defaultCurrency) === c ? 'selected' : ''}>${SK.CURRENCY_NAMES[c]}</option>`).join('')}</select></label>
      </div>
      <div class="field"><span class="lbl">البند</span><div data-slot="cats">${catChips(kind, t.categoryId)}</div></div>
      <label class="field"><span class="lbl">الاسم (اختياري)</span><input name="title" type="text" value="${esc(t.title || '')}" placeholder="مثلاً: بنزين، القرض العقاري"></label>
      <label class="field"><span class="lbl">التاريخ</span><input name="date" type="date" value="${U.inputDate(t.date || Date.now())}"></label>
      <label class="field"><span class="lbl">ملاحظة (اختياري)</span><input name="note" type="text" value="${esc(t.note || '')}" placeholder="مثلاً: مقاضي الأسبوع من بنده"></label>
    </form>`;
  }
  function readTxForm(root, base) {
    const f = $('form[data-form="tx"]', root);
    const amount = parseFloat(String(f.amount.value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[,٬]/g, '').replace('٫', '.'));
    if (!(amount > 0)) { toast('اكتب المبلغ', 'err'); f.amount.focus(); return null; }
    const kind = chipVal(f, 'kind') || 'expense';
    let cat = chipVal(f, 'cat'); if (!cat || cat === '__new') cat = kind === 'income' ? 'extra' : 'other';
    const d = new Date(U.fromInputs(f.date.value, '12:00'));
    if (U.startOfDay(d) === U.startOfDay(Date.now())) d.setTime(Date.now());
    return Object.assign({}, base || {}, { kind, amount, currency: f.currency.value, categoryId: cat, title: f.title.value.trim() || S.category(cat).name, date: d.getTime(), note: f.note.value.trim() });
  }

  // ================= شاشة الإضافة (صوت / يدوي) =================
  function draftCard(d, i, kind) {
    if (kind === 'task') {
      const s = SK.STRENGTH_NAMES[d.strength || SK.LEVEL_STRENGTH[d.level]];
      return `<div class="draft">
        <div class="draft-h">${typeBadge(d.type)}<b>${esc(d.title)}</b>${levelBadge(d.level)}</div>
        <ul class="draft-d">
          <li>${esc(U.dateShort(d.due))}${d.timeSet ? ' · الساعة ' + esc(U.time(d.due)) : ' · بدون وقت محدد'}${d.approxPrayer ? ' (تقريباً)' : ''}</li>
          ${d.before ? `<li>${d.type === 'task' ? 'ينبهك قبلها' : 'تنبيه "اطلع الحين"'} بـ ${esc(SK.beforeText(d.before))}</li>` : ''}
          <li class="${d.level === 'urgent' ? 'red' : d.level === 'important' ? 'orange' : ''}">التنبيه: ${esc(s)}${(d.strength || SK.LEVEL_STRENGTH[d.level]) !== 'normal' ? ' (شاشة كاملة)' : ''}</li>
          ${d.repeat && d.repeat !== 'none' ? `<li>يتكرر: ${esc(S.repeatLabel(d))}</li>` : ''}
          ${d.money ? `<li>مرتبطة بالمالية: لما تخلصها تنسجل مصروف</li>` : ''}
          ${d.place ? `<li>📍 ${esc(d.place.name)}: "اطلع الحين" حسب وقت الطريق من موقعك</li>` : ''}
        </ul>
        <div class="draft-acts"><button type="button" class="btn-sm outline" data-act="edit-draft" data-i="${i}">${I.edit} تعديل</button>${d.type !== 'task' && !d.place ? `<button type="button" class="btn-sm outline" data-act="place-open" data-i="${i}">${I.pin} حدد المكان</button>` : ''}<button type="button" class="btn-icon" data-act="drop-draft" data-i="${i}" aria-label="احذف">${I.x}</button></div>
      </div>`;
    }
    const c = S.category(d.categoryId);
    const sar = S.toSar(d.amount, d.currency);
    return `<div class="draft tx-draft">
      <div class="draft-h">${badge('k-' + d.kind, SK.KIND_NAMES[d.kind])}<span class="grow"><b>${esc(d.title)}</b><small>البند: ${esc(c.name)}</small></span>
        <b class="draft-amt ${d.kind === 'income' ? 'teal' : ''}">${d.kind === 'income' ? '+' : '-'}${U.money(d.amount, true)} ${esc(SK.CURRENCY_NAMES[d.currency] || d.currency)}</b></div>
      ${d.currency !== 'SAR' ? `<small class="muted">≈ ${U.money(sar)} ريال</small>` : ''}
      <div class="draft-acts"><button type="button" class="btn-sm outline" data-act="edit-draft" data-i="${i}">${I.edit} تعديل</button><button type="button" class="btn-icon" data-act="drop-draft" data-i="${i}" aria-label="احذف">${I.x}</button></div>
    </div>`;
  }
  function viewAdd(kind, params) {
    const mode = st.mode;
    const v = st.voice;
    const back = params.trip ? `#/trip/${params.trip}?tab=agenda` : kind === 'task' ? '#/tasks' : '#/money';
    const title = kind === 'task' ? 'موعد أو مهمة جديدة' : 'تسجيل مالي';
    const example = kind === 'task'
      ? 'مثلاً: "بكرة الساعة عشرة الصبح عندي موعد مهم في المستشفى، وذكرني أسدد فاتورة الكهرباء قبل الخميس"'
      : 'مثلاً: "استلمت الراتب عشرة آلاف، وخصم البنك القرض الشخصي ستة آلاف" أو "اشتريت مقاضي بمية دولار"';
    return `${header(title, back)}
    <main class="wrap narrow">
      ${chips('mode', [{ v: 'voice', t: 'بالصوت' }, { v: 'manual', t: 'يدوي' }], mode, 'seg-chips')}
      ${mode === 'voice' ? `
        <section class="voice">
          <button type="button" class="mic ${v.listening ? 'on' : ''}" data-act="listen" aria-label="${v.listening ? 'أسمعك' : 'اضغط وتكلم'}">${I.mic}</button>
          <p class="mic-hint">${v.listening ? 'أسمعك... تكلم' : (N.voiceAvailable() ? 'اضغط على المايك وتكلم' : 'التسجيل بالصوت مو متاح هنا، اكتب الجملة تحت')}</p>
          ${v.err ? `<p class="err-msg">${esc(v.err)}</p>` : ''}
          <label class="field"><span class="lbl">${v.text ? 'قلت:' : 'أو اكتب الجملة هنا'}</span><textarea name="vtext" rows="3" placeholder="${esc(example)}">${esc(v.text)}</textarea></label>
          <button type="button" class="btn outline" data-act="parse">حلّل الجملة</button>
        </section>
        ${v.drafts.length ? `<h3 class="sub">فهمت منك ${v.drafts.length === 1 ? 'شي واحد' : v.drafts.length === 2 ? 'شيئين' : v.drafts.length + ' ' + (kind === 'task' ? 'أشياء' : 'عمليات')}:</h3>
          ${v.drafts.map((d, i) => draftCard(d, i, kind)).join('')}
          <div class="bottom inline"><button type="button" class="btn primary big" data-act="save-drafts" data-kind="${kind}">تأكيد وحفظ</button></div>
          <p class="muted center">اضغط "تعديل" لو فهمت شي غلط</p>` : (v.text ? '<p class="empty">ما فهمت شي من الجملة. جرب تقولها بطريقة ثانية أو استخدم اليدوي.</p>' : `<p class="muted center">${esc(example)}</p>`)}
      ` : `
        ${kind === 'task' ? taskForm(Object.assign({}, params.date ? { due: +params.date } : {}, params.trip ? { tripId: params.trip, tripKind: params.tk || 'activity', type: params.tk === 'prep' ? 'task' : 'appointment', level: 'important' } : {})) : txForm()}
        <div class="bottom inline"><button type="button" class="btn primary big" data-act="save-manual" data-kind="${kind}">حفظ</button></div>
      `}
    </main>`;
  }

  // ================= شاشة التعديل =================
  const backFor = it => it && it.tripId ? `#/trip/${it.tripId}?tab=${it.tripKind === 'prep' ? 'prep' : 'agenda'}` : '#/tasks';
  function viewEditTask(id) {
    const it = S.getItem(id);
    if (!it || it.deleted) return `${header('غير موجود', '#/tasks')}<main class="wrap narrow"><p class="empty">هذا العنصر محذوف.</p></main>`;
    return `${header('تعديل', backFor(it))}
    <main class="wrap narrow">
      ${it.done ? `<div class="banner teal">${I.check}<span>منجزة ${it.doneAt ? esc(U.dayRel(it.doneAt)) + ' ' + esc(U.time(it.doneAt)) : ''}</span></div>` : ''}
      ${taskForm(it)}
      <div class="bottom inline col">
        <button type="button" class="btn primary big" data-act="save-edit-task" data-id="${it.id}">حفظ التعديل</button>
        <div class="two">
          <button type="button" class="btn outline" data-act="toggle-done" data-id="${it.id}" data-back="1">${it.done ? 'رجّعها غير منجزة' : 'تم، خلصتها'}</button>
          <button type="button" class="btn danger" data-act="del-task" data-id="${it.id}">حذف</button>
        </div>
      </div>
    </main>`;
  }
  function viewEditTx(id) {
    const t = S.getTx(id);
    if (!t || t.deleted) return `${header('غير موجود', '#/money')}<main class="wrap narrow"><p class="empty">هذي العملية محذوفة.</p></main>`;
    return `${header('تعديل العملية', '#/money')}
    <main class="wrap narrow">
      ${txForm(t)}
      <div class="bottom inline col">
        <button type="button" class="btn primary big" data-act="save-edit-tx" data-id="${t.id}">حفظ التعديل</button>
        <button type="button" class="btn danger" data-act="del-tx" data-id="${t.id}">حذف العملية</button>
      </div>
    </main>`;
  }

  // ================= الإعدادات =================
  const PERMS = [
    { k: 'notifications', t: 'الإشعارات', d: 'عشان توصلك التنبيهات أصلاً' },
    { k: 'exactAlarm', t: 'المنبه الدقيق', d: 'التنبيه يجي في الدقيقة بالضبط، مو متأخر' },
    { k: 'fullScreen', t: 'الشاشة الكاملة', d: 'التنبيه المهم والعاجل يطلع على الشاشة كاملة حتى لو الجوال مقفل' },
    { k: 'overlay', t: 'الظهور فوق التطبيقات', d: 'يطلع لك التنبيه في وجهك حتى وأنت داخل تطبيق ثاني' },
    { k: 'battery', t: 'بدون قيود البطارية', d: 'عشان سامسونج ما يقفل التطبيق ويضيع التنبيهات' },
    { k: 'location', t: 'الموقع', d: 'عشان يحسب وقت الطريق للموعد من مكانك' },
    { k: 'bgLocation', t: 'الموقع طوال الوقت', d: 'يحسب الطريق حتى والتطبيق مقفل. اختر "السماح طوال الوقت"' }
  ];
  function viewSettings() {
    const sy = SK.sync;
    const cfg = sy.config();
    const perms = N.permissions();
    const cats = S.settings.categories;
    return `${header('الإعدادات', '#/' + (S.settings.lastTab || 'tasks'))}
    <main class="wrap narrow">
      ${N.isApp ? `<section class="card">
        <h2>صلاحيات التنبيه القوي</h2>
        ${PERMS.map(p => `<div class="perm"><span class="grow"><b>${p.t}</b><small>${p.d}</small></span>${perms[p.k] ? `<span class="ok">${I.check} مفعّل</span>` : `<button type="button" class="btn-sm" data-act="perm" data-k="${p.k}">فعّل</button>`}</div>`).join('')}
        <details class="tip"><summary>خطوات إضافية لجوالات سامسونج (مهمة)</summary>
          <ol>
            <li>الإعدادات ← البطارية ← حدود استخدام الخلفية ← <b>التطبيقات التي لا تدخل في وضع السكون أبداً</b> ← أضف "سكرتيري".</li>
            <li>الإعدادات ← التطبيقات ← سكرتيري ← البطارية ← <b>غير مقيّد</b>.</li>
            <li>الإعدادات ← التطبيقات ← سكرتيري ← الإشعارات ← فعّل كل الأنواع، وخلّ "تنبيهات قوية" على <b>تنبيه</b>.</li>
            <li>لو تستخدم وضع "عدم الإزعاج": أضف سكرتيري للتطبيقات المسموحة.</li>
          </ol>
        </details>
      </section>` : `<section class="card"><h2>التنبيهات في المتصفح</h2>
        <p class="muted">على الكمبيوتر، التنبيهات تشتغل طالما الصفحة مفتوحة. التنبيه القوي بالشاشة الكاملة يشتغل من تطبيق الجوال.</p>
        ${perms.notifications ? `<span class="ok">${I.check} الإشعارات مفعّلة</span>` : `<button type="button" class="btn-sm" data-act="perm" data-k="notifications">فعّل الإشعارات</button>`}
      </section>`}
      <section class="card">
        <h2>جرّب التنبيه</h2>
        <p class="muted">يطلع لك التنبيه بعد ١٠ ثواني. ${N.isApp ? 'اقفل الشاشة وانتظر.' : ''}</p>
        <div class="three">
          <button type="button" class="btn-sm outline" data-act="test" data-s="normal">عادي</button>
          <button type="button" class="btn-sm outline" data-act="test" data-s="strong">قوي</button>
          <button type="button" class="btn-sm red" data-act="test" data-s="repeat">قوي ومتكرر</button>
        </div>
      </section>
      ${calSection(perms)}
      <section class="card">
        <h2>${I.pin} خرائط جوجل (اختياري)</h2>
        <p class="muted">بدون مفتاح: البحث من OpenStreetMap ووقت الطريق تقديري (بدون زحمة مباشرة، ونضيف عليه ٣٠٪). مع مفتاح خرائط جوجل: وقت الطريق بالزحمة الحقيقية والبحث أدق.</p>
        <label class="field"><span class="lbl">مفتاح Google Maps API</span><input name="mapsKey" type="text" dir="ltr" value="${esc(S.settings.mapsKey || '')}" placeholder="AIza..."></label>
        <button type="button" class="btn-sm" data-act="save-maps">حفظ</button>
      </section>
      <section class="card">
        <h2>المزامنة بين أجهزتك</h2>
        ${sy.state === 'on' ? `<p><span class="ok">${I.check} متزامن</span> بحساب <b dir="ltr">${esc(sy.email)}</b></p>
          <p class="muted">أي شي تضيفه هنا يطلع في الجوال والتابلت والكمبيوتر.</p>
          <button type="button" class="btn-sm outline" data-act="sync-out">تسجيل خروج</button>`
        : cfg ? `<p class="muted">${sy.state === 'error' ? '<span class="red">' + esc(sy.error) + '</span>' : 'سجّل دخول بإيميلك (نفس الحساب في كل أجهزتك).'}</p>
          <label class="field"><span class="lbl">الإيميل</span><input name="email" type="email" dir="ltr" autocomplete="email" placeholder="you@gmail.com"></label>
          <label class="field"><span class="lbl">كلمة المرور</span><input name="pass" type="password" dir="ltr" autocomplete="current-password"></label>
          <div class="three">
            <button type="button" class="btn-sm" data-act="sync-in">دخول</button>
            <button type="button" class="btn-sm outline" data-act="sync-new">حساب جديد</button>
            <button type="button" class="btn-sm outline" data-act="sync-reset">نسيت كلمة المرور</button>
          </div>
          <button type="button" class="btn-link" data-act="sync-clear">تغيير إعدادات Firebase</button>`
        : `<p class="muted">حالياً بياناتك محفوظة على هذا الجهاز بس. عشان تتزامن مع باقي أجهزتك، الصق إعدادات مشروع Firebase حقك (الخطوات في ملف الدليل).</p>
          <label class="field"><span class="lbl">إعدادات Firebase (firebaseConfig)</span><textarea name="fbcfg" rows="5" dir="ltr" placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "..." }'></textarea></label>
          <button type="button" class="btn-sm" data-act="sync-cfg">حفظ وتفعيل</button>`}
      </section>
      <section class="card">
        <h2>البنود والميزانية الشهرية</h2>
        <p class="muted">حط حد شهري لأي بند، والتطبيق ينبهك لما توصل ٨٠٪ منه. خلّه صفر لو ما تبغى حد.</p>
        ${cats.filter(c => c.kind !== 'income').map(c => `<div class="budget-row"><span class="grow">${esc(c.name)}</span><input type="number" inputmode="numeric" min="0" data-budget="${c.id}" value="${c.budget || ''}" placeholder="بدون حد" aria-label="ميزانية ${esc(c.name)}">${isCustom(c) ? `<button type="button" class="btn-icon" data-act="del-cat" data-id="${c.id}" aria-label="احذف البند">${I.x}</button>` : ''}</div>`).join('')}
        <div class="add-cat">
          <input name="newcat" type="text" placeholder="اسم بند جديد" aria-label="اسم بند جديد">
          <select name="newcatkind" aria-label="نوع البند"><option value="expense">مصروف</option><option value="income">دخل</option></select>
          <button type="button" class="btn-sm" data-act="add-cat">أضف</button>
        </div>
        <button type="button" class="btn-sm" data-act="save-budgets">حفظ الميزانية</button>
      </section>
      <section class="card">
        <h2>أسعار العملات (مقابل الريال)</h2>
        <p class="muted">عدّلها لما تتغير. العمليات القديمة تبقى بسعرها وقت التسجيل.</p>
        <div class="rates">${Object.keys(SK.CURRENCY_NAMES).filter(c => c !== 'SAR').map(c => `<label class="field"><span class="lbl">1 ${SK.CURRENCY_NAMES[c]} =</span><input type="number" step="0.0001" data-rate="${c}" value="${S.settings.rates[c] || ''}"></label>`).join('')}</div>
        <label class="field"><span class="lbl">يوم نزول الراتب في الشهر</span><input name="salaryDay" type="number" min="0" max="31" value="${S.settings.salaryDay || ''}"></label>
        <button type="button" class="btn-sm" data-act="save-rates">حفظ</button>
      </section>
      <section class="card">
        <h2>نسخة احتياطية</h2>
        <div class="two">
          <button type="button" class="btn-sm outline" data-act="export">تنزيل نسخة</button>
          <label class="btn-sm outline file-btn">استرجاع نسخة<input type="file" accept="application/json,.json" data-act-change="import" hidden></label>
        </div>
      </section>
      <p class="muted center">سكرتيري · ${esc(N.version())}</p>
    </main>`;
  }
  function calSection(perms) {
    const c = S.settings.cal || {};
    if (!N.isApp) return `<section class="card"><h2>📅 تقويم جوجل</h2><p class="muted">الربط مع تقويم جوجل يشتغل من تطبيق الجوال. المواعيد اللي تنضاف من هناك تطلع في تقويم جوجل على الكمبيوتر تلقائياً.</p></section>`;
    if (!perms.calendar) return `<section class="card"><h2>📅 تقويم جوجل</h2><p class="muted">مواعيدك في سكرتيري تنزل تلقائياً في تقويم جوجل، وتطلع في كل أجهزتك.</p><button type="button" class="btn-sm" data-act="perm" data-k="calendar">اسمح بالوصول للتقويم</button></section>`;
    const cals = N.calendars().filter(x => x.writable);
    const sel = c.calId || (cals.find(x => x.google && x.primary) || cals.find(x => x.google) || cals[0] || {}).id;
    return `<section class="card">
      <h2>📅 تقويم جوجل</h2>
      <p class="muted">المواعيد اللي تضيفها في سكرتيري تنزل في التقويم اللي تختاره، وأي تعديل أو حذف يتحدّث هناك بعد.</p>
      <label class="perm"><span class="grow"><b>أضف مواعيد سكرتيري للتقويم</b></span><input type="checkbox" name="calOn" ${c.on ? 'checked' : ''} style="width:24px;height:24px"></label>
      <label class="perm"><span class="grow"><b>والمهام كمان</b><small>المهام اللي لها وقت محدد</small></span><input type="checkbox" name="calTasks" ${c.tasks ? 'checked' : ''} style="width:24px;height:24px"></label>
      <label class="field"><span class="lbl">التقويم</span><select name="calId">${cals.map(x => `<option value="${x.id}" ${String(x.id) === String(sel) ? 'selected' : ''}>${esc(x.name)}${x.account && x.account !== x.name ? ' (' + esc(x.account) + ')' : ''}</option>`).join('')}</select></label>
      ${cals.length ? '' : '<p class="err-msg">ما لقيت تقويم. تأكد إن حساب جوجل مضاف في الجوال وفيه مزامنة التقويم.</p>'}
      <div class="two"><button type="button" class="btn-sm" data-act="save-cal">حفظ</button><button type="button" class="btn-sm outline" data-act="cal-backfill">أضف المواعيد الحالية</button></div>
    </section>`;
  }
  function calWanted(it) {
    const c = S.settings.cal || {};
    if (!c.on || !c.calId || !N.isApp) return false;
    if (it.type === 'task') return !!c.tasks && it.timeSet !== false;
    return true;
  }
  function exportToCal(it) {
    // يرجّع true لو تغيّر رقم الحدث
    const c = S.settings.cal || {};
    if (it.calEventId && (it.deleted || !calWanted(it))) {
      if (it.deleted || !c.on) { N.calDelete(it.calEventId); it.calEventId = 0; return true; }
    }
    if (it.deleted || !calWanted(it)) return false;
    const begin = it.timeSet === false ? new Date(it.due).setHours(9, 0, 0, 0) : it.due;
    const id = N.calUpsert({ eventId: it.calEventId || -1, calId: +c.calId, title: it.title, begin, end: begin + 3600e3, location: it.place ? it.place.name : '', note: [SK.LEVEL_NAMES[it.level || 'normal'], it.note].filter(Boolean).join(' · ') });
    if (id > 0 && id !== it.calEventId) { it.calEventId = id; return true; }
    return false;
  }
  const isCustom = c => !Parser.DEFAULT_CATEGORIES.some(d => d.id === c.id);

  // ================= شاشات منبثقة =================
  function renderSheet() {
    const sh = st.sheet; let el = $('#sheet');
    if (!sh) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'sheet'; document.body.appendChild(el); }
    let body = '';
    if (sh.type === 'edit-draft') body = `<h2>تعديل</h2>${sh.kind === 'task' ? taskForm(st.voice.drafts[sh.i]) : txForm(st.voice.drafts[sh.i])}<button type="button" class="btn primary big" data-act="sheet-save">تم</button>`;
    if (sh.type === 'resched') {
      const it = S.getItem(sh.id);
      const base = Math.max(Date.now(), 0);
      const tom = new Date(it.due); const n = new Date(); tom.setFullYear(n.getFullYear(), n.getMonth(), n.getDate() + 1);
      body = `<h2>أعد جدولة: ${esc(it.title)}</h2>
        <div class="quick">
          <button type="button" class="btn-sm outline" data-act="resched-at" data-at="${base + 3600e3}">بعد ساعة</button>
          <button type="button" class="btn-sm outline" data-act="resched-at" data-at="${base + 3 * 3600e3}">بعد ٣ ساعات</button>
          <button type="button" class="btn-sm outline" data-act="resched-at" data-at="${tom.getTime()}">بكرة نفس الوقت</button>
          <button type="button" class="btn-sm outline" data-act="resched-at" data-at="${U.addDays(tom.getTime(), 6)}">الأسبوع الجاي</button>
        </div>
        <div class="two"><label class="field"><span class="lbl">التاريخ</span><input name="rdate" type="date" value="${U.inputDate(tom)}"></label><label class="field"><span class="lbl">الوقت</span><input name="rtime" type="time" value="${U.inputTime(it.due)}"></label></div>
        <button type="button" class="btn primary big" data-act="resched-custom">حفظ</button>`;
    }
    if (sh.type === 'money-link') {
      const it = S.getItem(sh.id);
      body = `<h2>كم دفعت؟</h2><p class="muted">${esc(it.title)}</p>${txForm({ kind: S.category(it.money).kind === 'deduction' ? 'deduction' : 'expense', categoryId: it.money, title: it.title })}
        <button type="button" class="btn primary big" data-act="money-link-save">سجّل المصروف</button><button type="button" class="btn ghost" data-act="sheet-close">تخطي</button>`;
    }
    if (sh.type === 'place') {
      const res = sh.results || [];
      body = `<h2>${I.pin} حدد المكان</h2>
        <div class="search-row"><input name="pq" type="text" value="${esc(sh.q || '')}" placeholder="مثلاً: مدينة الملك عبدالله الطبية مكة"><button type="button" class="btn-sm" data-act="place-search">بحث</button></div>
        <div class="two"><button type="button" class="btn-sm outline" data-act="place-here">موقعي الحالي</button><button type="button" class="btn-sm outline" data-act="place-link">رابط من خرائط جوجل</button></div>
        ${sh.busy ? '<p class="muted center">جاري البحث...</p>' : ''}${sh.err ? `<p class="err-msg">${esc(sh.err)}</p>` : ''}
        <div class="results">${res.map((r, k) => `<button type="button" class="result" data-act="place-pick" data-k="${k}"><b>${esc(r.name)}</b><small>${esc(r.address)}</small></button>`).join('')}</div>
        ${res.length ? `<small class="muted">${res[0].src === 'google' ? 'النتائج من خرائط جوجل' : 'النتائج من OpenStreetMap. لو ما لقيت المكان، الصق رابطه من خرائط جوجل'}</small>` : ''}`;
    }
    if (sh.type === 'new-cat') {
      body = `<h2>بند جديد</h2><label class="field"><span class="lbl">اسم البند</span><input name="catname" type="text" placeholder="مثلاً: الجيم"></label><button type="button" class="btn primary big" data-act="new-cat-save">أضف</button>`;
    }
    el.innerHTML = `<div class="sheet-bg" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true"><button type="button" class="icon-btn sheet-x" data-act="sheet-close" aria-label="إغلاق">${I.x}</button>${body}</div>`;
  }

  // ---------- منبه المتصفح ----------
  function showWebAlarm(a) {
    let el = $('#walarm'); if (!el) { el = document.createElement('div'); el.id = 'walarm'; document.body.appendChild(el); }
    el.innerHTML = `<div class="walarm ${a.level === 'urgent' ? 'urgent' : ''}" role="alertdialog" aria-label="${esc(a.header)}">
      <div class="wa-top">${I.bell} تنبيه ${a.level === 'urgent' ? 'عاجل' : 'مهم'}</div>
      <div class="wa-h">${esc(a.header)}</div><h1>${esc(a.title)}</h1><p>${esc(a.body)}</p>
      <div class="wa-clock">${esc(U.time(Date.now()).replace(/ [صم]$/, ''))}</div>
      <button type="button" class="wa-done" data-act="wa" data-op="done" data-id="${a.id}">${I.check} تم</button>
      <div class="two"><button type="button" class="wa-sn" data-act="wa" data-op="10" data-id="${a.id}">أجّل ١٠ دقائق</button><button type="button" class="wa-sn" data-act="wa" data-op="60" data-id="${a.id}">أجّل ساعة</button></div>
    </div>`;
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); let n = 0; const beep = () => { if (!$('#walarm') || n++ > 30) return; const o = ctx.createOscillator(); o.frequency.value = 880; o.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.25); setTimeout(beep, 1000); }; beep(); } catch (e) { }
  }

  // ================= الرسم =================
  function render() {
    const r = route();
    const app = $('#app');
    let html = '';
    if (r.name === 'tasks') { S.settings.lastTab = 'tasks'; html = viewTasks(); }
    else if (r.name === 'money') { S.settings.lastTab = 'money'; html = viewMoney(); }
    else if (r.name === 'task' && r.parts[1] === 'new') html = viewAdd('task', r.params);
    else if (r.name === 'task' && r.parts[1]) html = viewEditTask(r.parts[1]);
    else if (r.name === 'tx' && r.parts[1] === 'new') html = viewAdd('tx', r.params);
    else if (r.name === 'tx' && r.parts[1]) html = viewEditTx(r.parts[1]);
    else if (r.name === 'settings') html = viewSettings();
    else if (SK.travel && SK.travel.handles(r)) { if (r.name === 'travel') S.settings.lastTab = 'travel'; html = SK.travel.view(r, SK.ui); }
    else { html = viewTasks(); }
    app.innerHTML = html;
    const mainEl = $('main', app);
    if (mainEl) mainEl.insertAdjacentHTML('beforeend', '<footer class="credit" dir="ltr">Powered by Mr_ADHD</footer>');
    try { localStorage.setItem('sk_settings', JSON.stringify(S.settings)); } catch (e) { }
    renderSheet();
  }
  const isFormRoute = () => { const r = route(); return (r.name === 'task' || r.name === 'tx') || r.name === 'settings' || (SK.travel && SK.travel.isForm(r)); };

  // ================= الأوامر =================
  function readVoiceText() { const ta = $('textarea[name="vtext"]'); return ta ? ta.value.trim() : st.voice.text; }
  function parseNow(kind) {
    const text = readVoiceText(); st.voice.text = text; st.voice.err = '';
    if (!text) { st.voice.drafts = []; render(); return; }
    if (kind === 'task') {
      st.voice.drafts = Parser.parseTasks(text).map(d => Object.assign(d, { strength: SK.LEVEL_STRENGTH[d.level] }));
    } else {
      st.voice.drafts = Parser.parseFinance(text, { categories: S.settings.categories, defaultCurrency: S.settings.defaultCurrency });
    }
    render();
  }
  function budgetCheck(t) {
    if (t.kind === 'income') return;
    const c = S.category(t.categoryId); if (!(c.budget > 0)) return;
    const spent = S.summary(U.startOfMonth(Date.now()), U.endOfMonth(Date.now())).byCat[c.id] || 0;
    const before = spent - t.sar;
    const p = spent / c.budget, p0 = before / c.budget;
    if (p >= 1 && p0 < 1) { toast(`تجاوزت ميزانية ${c.name} لهالشهر!`, 'err'); N.notify('تجاوزت الميزانية', `صرفت ${U.money(spent)} من ${U.money(c.budget)} ريال في ${c.name}`); }
    else if (p >= 0.8 && p0 < 0.8) { toast(`انتبه: صرفت ${Math.round(p * 100)}% من ميزانية ${c.name}`, 'warn'); N.notify('قربت تخلص الميزانية', `صرفت ${Math.round(p * 100)}% من ميزانية ${c.name}`); }
  }
  function setPlace(p) {
    const sh = st.sheet;
    if (typeof sh.target === 'number') {
      const d = st.voice.drafts[sh.target]; d.place = p;
      if (d.type === 'task') d.type = 'appointment';
      d.before = 0; // "اطلع الحين" يغني عن التذكير الثابت
      st.sheet = sh.prev && sh.prev.type === 'edit-draft' ? sh.prev : null;
      if (st.sheet) renderSheet(); else render();
    } else {
      st.sheet = null; renderSheet();
      const f = $('#app form[data-form="task"]');
      if (f) { f.plat.value = p.lat; f.plng.value = p.lng; f.pname.value = p.name; $('[data-slot="place"]', f).innerHTML = placeChip(p); }
    }
    toast('تم تحديد المكان', 'ok');
    showEta(p);
  }
  function showEta(p) {
    SK.geo.travel(p.lat, p.lng).then(r => {
      const txt = `الطريق من موقعك الحين تقريباً ${r.minutes} دقيقة${r.km ? ' (' + r.km + ' كم)' : ''}${r.src === 'osm' ? ' · تقديري بدون زحمة مباشرة' : ''}`;
      $$('[data-slot="eta"]').forEach(e => e.textContent = txt);
    }).catch(() => { $$('[data-slot="eta"]').forEach(e => e.textContent = 'ما قدرت أحسب الطريق الحين (فعّل الموقع)'); });
  }
  function afterDone(it) { if (it && it.done && it.money) { st.sheet = { type: 'money-link', id: it.id }; renderSheet(); } }

  const actions = {
    chip(d, el) {
      const form = el.closest('form') || document;
      $$(`.chip[data-group="${d.group}"]`, el.closest('.chips')).forEach(b => b.setAttribute('aria-pressed', String(b === el)));
      if (d.group === 'taskPeriod') { st.taskPeriod = d.val; render(); }
      else if (d.group === 'moneyPeriod') { st.moneyPeriod = d.val; st.moneyOffset = 0; render(); }
      else if (d.group === 'mode') { if (st.mode === 'voice') st.voice.text = readVoiceText(); st.mode = d.val; render(); }
      else if (d.group === 'level') {
        const s = SK.LEVEL_STRENGTH[d.val];
        $$('.chip[data-group="strength"]', form).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.val === s)));
      }
      else if (d.group === 'kind') { const slot = $('[data-slot="cats"]', form); if (slot) slot.innerHTML = catChips(d.val, chipVal(form, 'cat')); }
      else if (d.group === 'cat' && d.val === '__new') { el.setAttribute('aria-pressed', 'false'); st.sheetReturn = st.sheet; st.newCatKind = chipVal(form, 'kind') || 'expense'; st.newCatForm = form; actions.newCat(); }
    },
    newCat() {
      const name = prompt('اسم البند الجديد:');
      if (!name || !name.trim()) return;
      const id = 'c_' + U.uid();
      S.settings.categories.push({ id, name: name.trim(), kind: st.newCatKind === 'income' ? 'income' : 'expense', words: [Parser.norm(name.trim())], budget: 0 });
      S.putSettings({});
      const form = st.newCatForm;
      if (form && document.body.contains(form)) { const slot = $('[data-slot="cats"]', form); if (slot) slot.innerHTML = catChips(st.newCatKind, id); }
    },
    listen(d, el, kind) {
      if (st.voice.listening) return;
      st.voice.listening = true; st.voice.err = ''; render();
      N.startVoice((text, err) => {
        st.voice.listening = false;
        if (text) { st.voice.text = (st.voice.textAppend && st.voice.text ? st.voice.text + '، ' : '') + text; const ta = $('textarea[name="vtext"]'); if (ta) ta.value = st.voice.text; parseNow(route().name === 'task' ? 'task' : 'tx'); }
        else { st.voice.err = err || ''; render(); }
      });
    },
    parse() { parseNow(route().name === 'task' ? 'task' : 'tx'); },
    'edit-draft'(d) { st.voice.text = readVoiceText(); st.sheet = { type: 'edit-draft', i: +d.i, kind: route().name === 'task' ? 'task' : 'tx' }; renderSheet(); },
    'drop-draft'(d) { st.voice.text = readVoiceText(); st.voice.drafts.splice(+d.i, 1); render(); },
    'sheet-close'() { st.sheet = null; renderSheet(); },
    'sheet-save'() {
      const sh = st.sheet, root = $('#sheet');
      const cur = st.voice.drafts[sh.i];
      const v = sh.kind === 'task' ? readTaskForm(root, cur) : readTxForm(root, cur);
      if (!v) return;
      st.voice.drafts[sh.i] = v; st.sheet = null; render();
    },
    'save-drafts'(d) {
      const n = st.voice.drafts.length; if (!n) return;
      const tripP = route().params.trip;
      if (d.kind === 'task') st.voice.drafts.forEach(x => { const it = Object.assign({}, x); if (tripP && !it.tripId) { it.tripId = tripP; it.tripKind = it.tripKind || 'activity'; } delete it.source; delete it.approxPrayer; delete it.dateSet; delete it.deadline; it.done = false; S.putItem(S.normalizeRepeat(it)); });
      else st.voice.drafts.forEach(x => { const t = Object.assign({}, x); delete t.source; const saved = S.putTx(t); budgetCheck(saved); });
      st.voice = { text: '', listening: false, err: '', drafts: [] };
      toast(n === 1 ? 'تم الحفظ' : `تم حفظ ${n}`, 'ok');
      go(d.kind === 'task' ? (tripP ? `#/trip/${tripP}?tab=agenda` : '#/tasks') : '#/money');
    },
    'save-manual'(d) {
      if (d.kind === 'task') { const it = readTaskForm(document); if (!it) return; it.done = false; S.putItem(it); toast('تم الحفظ', 'ok'); go(backFor(it)); }
      else { const t = readTxForm(document); if (!t) return; budgetCheck(S.putTx(t)); toast('تم الحفظ', 'ok'); go('#/money'); }
    },
    'save-edit-task'(d) {
      const old = S.getItem(d.id); const it = readTaskForm(document, old); if (!it) return;
      if (it.due !== old.due) { it.snoozeUntil = 0; it.missedAck = false; }
      S.putItem(it); toast('تم الحفظ', 'ok'); go(backFor(it));
    },
    'save-edit-tx'(d) { const t = readTxForm(document, S.getTx(d.id)); if (!t) return; S.putTx(t); toast('تم الحفظ', 'ok'); go('#/money'); },
    'del-task'(d) { if (!confirm('تحذفها؟')) return; const b = backFor(S.getItem(d.id)); S.removeItem(d.id); toast('انحذفت'); go(b); },
    'del-tx'(d) { if (!confirm('تحذف العملية؟')) return; S.removeTx(d.id); toast('انحذفت'); go('#/money'); },
    'toggle-done'(d) {
      const it = S.getItem(d.id); if (!it) return;
      if (it.done) { it.done = false; it.doneAt = 0; S.putItem(it); }
      else { S.completeItem(d.id); toast('أحسنت!', 'ok'); }
      if (d.back) go(backFor(it));
      afterDone(S.getItem(d.id));
    },
    'ack-missed'(d) { const it = S.getItem(d.id); if (it) { it.missedAck = true; S.putItem(it); } },
    resched(d) { st.sheet = { type: 'resched', id: d.id }; renderSheet(); },
    'resched-at'(d) { S.rescheduleItem(st.sheet.id, +d.at); st.sheet = null; toast('تمت الجدولة', 'ok'); render(); },
    'resched-custom'() { const r = $('#sheet'); S.rescheduleItem(st.sheet.id, U.fromInputs($('[name="rdate"]', r).value, $('[name="rtime"]', r).value)); st.sheet = null; toast('تمت الجدولة', 'ok'); render(); },
    'money-link-save'() { const t = readTxForm($('#sheet')); if (!t) return; budgetCheck(S.putTx(t)); st.sheet = null; toast('انسجل في المالية', 'ok'); render(); },
    'toggle-day'(d, el) { el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true')); },
    'place-open'(d) {
      // يطلب صلاحية الموقع أول ما تحدد مكان
      if (N.isApp) { const pm = N.permissions(); if (pm.location === false) N.requestPermission('location'); }
      let target = 'form', q = '';
      if (st.sheet && st.sheet.type === 'edit-draft') {
        // نحفظ اللي انكتب في نافذة التعديل قبل ما نفتح البحث
        const v = readTaskForm($('#sheet'), st.voice.drafts[st.sheet.i]); if (v) st.voice.drafts[st.sheet.i] = v;
        target = st.sheet.i; q = st.voice.drafts[target].title;
      } else if (d.i != null) {
        st.voice.text = readVoiceText(); target = +d.i; q = st.voice.drafts[target].title;
      } else {
        const form = $('#app form[data-form="task"]'); q = form ? form.title.value : '';
      }
      st.sheet = { type: 'place', target, q, results: [], prev: st.sheet };
      renderSheet(); if (q) actions['place-search']();
    },
    async 'place-search'() {
      const sh = st.sheet; const inp = $('#sheet [name="pq"]'); sh.q = inp ? inp.value : sh.q;
      sh.busy = true; sh.err = ''; renderSheet();
      try { sh.results = await SK.geo.search(sh.q); if (!sh.results.length) sh.err = 'ما لقيت نتائج. جرب اسم ثاني أو الصق رابط من خرائط جوجل'; }
      catch (e) { sh.err = 'ما قدرت أبحث، تأكد من الإنترنت'; }
      sh.busy = false; if (st.sheet === sh) renderSheet();
    },
    async 'place-here'() {
      const sh = st.sheet; sh.busy = true; sh.err = ''; renderSheet();
      try { const p = await SK.geo.here(); setPlace({ name: 'موقعي الحالي', lat: p.lat, lng: p.lng }); }
      catch (e) { sh.busy = false; sh.err = 'ما قدرت أحدد موقعك: ' + e.message; renderSheet(); }
    },
    async 'place-link'() {
      const url = prompt('الصق رابط المكان من خرائط جوجل (من زر "مشاركة"):'); if (!url) return;
      const sh = st.sheet;
      try { setPlace(await SK.geo.fromLink(url)); } catch (e) { sh.err = e.message; renderSheet(); }
    },
    'place-pick'(d) { const r = st.sheet.results[+d.k]; setPlace({ name: r.name, lat: r.lat, lng: r.lng }); },
    'place-clear'(d, el) {
      const f = el.closest('form'); if (!f) return;
      if (f.closest('#sheet') && st.sheet && st.sheet.type === 'edit-draft') { st.voice.drafts[st.sheet.i].place = null; }
      f.plat.value = ''; f.plng.value = ''; f.pname.value = ''; $('[data-slot="place"]', f).innerHTML = placeChip(null);
    },
    'money-prev'() { st.moneyOffset--; render(); },
    'money-next'() { if (st.moneyOffset < 0) st.moneyOffset++; render(); },
    'toggle-alltx'() { st.showAllTx = !st.showAllTx; render(); },
    perm(d) { N.requestPermission(d.k); },
    test(d) { N.testAlarm(d.s); toast('انتظر ١٠ ثواني...'); },
    'sync-cfg'() { try { SK.sync.saveConfig($('[name="fbcfg"]').value); SK.sync.init().then(render); toast('تم الحفظ', 'ok'); render(); } catch (e) { toast('الإعدادات مو صحيحة: ' + e.message, 'err'); } },
    'sync-clear'() { if (confirm('تمسح إعدادات Firebase؟')) { SK.sync.signOut(); SK.sync.clearConfig(); SK.sync.state = 'off'; render(); } },
    async 'sync-in'(d, el, k, create) {
      const email = $('[name="email"]').value.trim(), pass = $('[name="pass"]').value;
      if (!email || !pass) { toast('اكتب الإيميل وكلمة المرور', 'err'); return; }
      try { await SK.sync.signIn(email, pass, create); toast('تم الدخول', 'ok'); } catch (e) { toast(authErr(e), 'err'); }
    },
    'sync-new'(d, el) { return actions['sync-in'](d, el, null, true); },
    async 'sync-reset'() { const email = $('[name="email"]').value.trim(); if (!email) { toast('اكتب الإيميل أول', 'err'); return; } try { await SK.sync.resetPassword(email); toast('أرسلنا رابط لإيميلك', 'ok'); } catch (e) { toast(authErr(e), 'err'); } },
    async 'sync-out'() { await SK.sync.signOut(); render(); },
    'save-cal'() {
      const cal = { on: $('[name="calOn"]').checked, tasks: $('[name="calTasks"]').checked, calId: $('[name="calId"]') ? $('[name="calId"]').value : null };
      const old = S.settings.cal || {};
      S.putSettings({ cal });
      if (old.on && !cal.on) toast('وقفنا الإضافة للتقويم', 'ok');
      else if (cal.on && !old.on) { actions['cal-backfill'](); return; }
      else toast('تم الحفظ', 'ok');
    },
    'cal-backfill'() {
      if (!(S.settings.cal || {}).on) { toast('فعّل "أضف مواعيد سكرتيري للتقويم" أول', 'err'); return; }
      let n = 0;
      S.activeItems().filter(i => !i.done && i.due > Date.now() - 3600e3).forEach(i => { if (exportToCal(i)) { S.putItem(i, { silent: true }); SK.sync.push('item', i); n++; } });
      toast(n ? `انضاف ${n} للتقويم` : 'كل المواعيد موجودة في التقويم', 'ok');
    },
    'save-maps'() { S.putSettings({ mapsKey: $('[name="mapsKey"]').value.trim() }); N.setConfig({ mapsKey: S.settings.mapsKey }); toast('تم الحفظ', 'ok'); },
    'save-budgets'() {
      $$('[data-budget]').forEach(i => { const c = S.category(i.dataset.budget); if (c) c.budget = Math.max(0, +i.value || 0); });
      S.putSettings({}); toast('تم حفظ الميزانية', 'ok');
    },
    'add-cat'() {
      const name = $('[name="newcat"]').value.trim(); if (!name) return;
      S.settings.categories.push({ id: 'c_' + U.uid(), name, kind: $('[name="newcatkind"]').value, words: [Parser.norm(name)], budget: 0 });
      S.putSettings({}); toast('انضاف البند', 'ok'); render();
    },
    'del-cat'(d) { if (!confirm('تحذف البند؟ العمليات القديمة تنتقل لـ "أخرى"')) return; S.settings.categories = S.settings.categories.filter(c => c.id !== d.id); S.putSettings({}); render(); },
    'save-rates'() {
      const rates = Object.assign({}, S.settings.rates);
      $$('[data-rate]').forEach(i => { const v = parseFloat(i.value); if (v > 0) rates[i.dataset.rate] = v; });
      S.putSettings({ rates, salaryDay: Math.max(0, Math.min(31, +$('[name="salaryDay"]').value || 0)) }); toast('تم الحفظ', 'ok');
    },
    export() {
      const blob = new Blob([S.exportAll()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sekrteery-backup-' + U.inputDate(Date.now()) + '.json'; a.click();
    },
    wa(d) {
      const el = $('#walarm'); if (el) el.remove();
      if (d.id === 'test') return;
      if (d.op === 'done') { S.completeItem(d.id); afterDone(S.getItem(d.id)); }
      else S.snoozeItem(d.id, Date.now() + (+d.op) * 6e4);
    }
  };
  if (SK.travel) Object.assign(actions, SK.travel.actions);
  SK.ui = { I, $, $$, esc, chips, chipVal, toast, header, tabs, go, route, render: () => render() };
  function authErr(e) {
    const c = (e && e.code) || '';
    if (/wrong-password|invalid-credential|invalid-login/.test(c)) return 'الإيميل أو كلمة المرور غلط';
    if (/user-not-found/.test(c)) return 'ما فيه حساب بهالإيميل، اضغط "حساب جديد"';
    if (/email-already/.test(c)) return 'الإيميل مسجل من قبل، اضغط "دخول"';
    if (/weak-password/.test(c)) return 'كلمة المرور لازم تكون ٦ حروف أو أكثر';
    if (/network/.test(c)) return 'ما فيه إنترنت';
    return (e && e.message) || 'صار خطأ';
  }

  // ================= التشغيل =================
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = actions[el.dataset.act]; if (!fn) return;
    e.preventDefault();
    fn(el.dataset, el);
  });
  document.addEventListener('change', e => {
    const ch = e.target.dataset && e.target.dataset.change;
    if (ch === 'repeat' || ch === 'repUnit') {
      const f = e.target.closest('form');
      const box = $('[data-slot="customRep"]', f); if (box) box.hidden = f.repeat.value !== 'custom';
      const days = $('[data-slot="repDays"]', f); if (days) days.hidden = f.repUnit.value !== 'week';
      return;
    }
    if (e.target.dataset && e.target.dataset.actChange === 'import') {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => { try { S.importAll(t); toast('تم الاسترجاع', 'ok'); render(); } catch (er) { toast('الملف مو صحيح', 'err'); } });
    }
  });
  window.addEventListener('hashchange', () => {
    const r = route();
    st.sheet = null;
    if (SK.travel) SK.travel.onRoute(r);
    if ((r.name === 'task' || r.name === 'tx') && r.parts[1] === 'new') {
      st.mode = r.params.mode === 'manual' ? 'manual' : 'voice';
      st.voice = { text: '', listening: false, err: '', drafts: [] };
      render();
      if (st.mode === 'voice' && r.params.auto && N.voiceAvailable() && N.isApp) actions.listen();
      return;
    }
    render(); window.scrollTo(0, 0);
  });

  function applyNativeActions() {
    const acts = N.takeActions();
    acts.forEach(a => {
      if (a.action === 'done') { S.completeItem(a.id, a.at); afterDone(S.getItem(a.id)); }
      if (a.action === 'snooze') S.snoozeItem(a.id, a.until);
    });
    return acts.length;
  }
  let lastSync = '';
  function pushAlarms() {
    const list = S.upcomingAlarms();
    const sig = JSON.stringify(list);
    if (sig === lastSync) return; lastSync = sig;
    N.syncAlarms(list);
  }

  S.onChange((kind, doc) => {
    if (kind === 'item' && doc && (doc.calEventId || calWanted(doc))) {
      try { if (exportToCal(doc)) S.putItem(doc, { silent: true }); } catch (e) { console.warn(e); }
    }
    if (kind === 'item' || kind === 'tx' || kind === 'settings' || kind === 'trip') SK.sync.push(kind, doc);
    if (kind === 'item' || kind === 'remote' || kind === 'import') pushAlarms();
    if (kind === 'remote' || kind === 'settings') N.setConfig({ mapsKey: S.settings.mapsKey || '' });
    if (kind === 'remote' && isFormRoute()) return; // لا نمسح اللي تكتبه
    if (!st.sheet || kind !== 'remote') render();
  });

  SK.app = {
    render, showWebAlarm,
    onResume() { applyNativeActions(); pushAlarms(); if (!isFormRoute() || route().name === 'settings') render(); }
  };

  // أول تشغيل
  const r0 = route();
  if (!location.hash) location.replace('#/' + (S.settings.lastTab || 'tasks'));
  if ((r0.name === 'task' || r0.name === 'tx') && r0.parts[1] === 'new') st.mode = r0.params.mode === 'manual' ? 'manual' : 'voice';
  applyNativeActions();
  // نحدّث تنبيهات العناصر القديمة (لو تغيّر شي في الحساب)
  render();
  pushAlarms();
  N.setConfig({ mapsKey: S.settings.mapsKey || '' });
  SK.sync.init();
  setInterval(() => { if (!isFormRoute() && !st.sheet && document.visibilityState === 'visible') render(); }, 60e3);
  if ('serviceWorker' in navigator && !N.isApp && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
})();
