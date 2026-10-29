/* سكرتيري — قسم السفر: الرحلات، الميزانية، الأجندة، والحساب الجماعي */
(function () {
  'use strict';
  const SK = window.SK;
  const S = SK.store, U = SK.util;

  const CATS = [
    { id: 'flight', name: 'طيران', icon: '✈️', kind: 'expense', words: ['طيران', 'تذكره', 'تذاكر', 'طياره', 'الطياره', 'الطيران'] },
    { id: 'hotel', name: 'سكن وفندق', icon: '🏨', kind: 'expense', words: ['فندق', 'الفندق', 'سكن', 'شقه', 'ايربنب', 'نزل'] },
    { id: 'transport', name: 'مواصلات', icon: '🚕', kind: 'expense', words: ['تاكسي', 'تكسي', 'اوبر', 'مترو', 'باص', 'قطار', 'بنزين', 'مواصلات', 'سياره', 'كريم', 'عباره'] },
    { id: 'food', name: 'أكل وقهوة', icon: '🍽️', kind: 'expense', words: ['عشا', 'عشاء', 'غدا', 'غداء', 'فطور', 'مطعم', 'قهوه', 'اكل', 'كافيه', 'تعشينا', 'تغدينا', 'افطرنا', 'سناك'] },
    { id: 'shopping', name: 'تسوق', icon: '🛍️', kind: 'expense', words: ['تسوق', 'ملابس', 'مول', 'سوق', 'اشترينا', 'شنطه'] },
    { id: 'activity', name: 'أنشطة ودخول', icon: '🎟️', kind: 'expense', words: ['متحف', 'جوله', 'نشاط', 'دخول', 'العاب', 'تذاكر دخول', 'بحريه', 'رحله بحريه'] },
    { id: 'gifts', name: 'هدايا', icon: '🎁', kind: 'expense', words: ['هديه', 'هدايا'] },
    { id: 'other', name: 'أخرى', icon: '•', kind: 'expense', words: [] }
  ];
  const KINDS = { flight: { icon: '✈️', name: 'طيران' }, hotel: { icon: '🏨', name: 'فندق' }, activity: { icon: '🎯', name: 'نشاط' }, prep: { icon: '📋', name: 'تجهيز' } };
  const PREP = [['الجواز (تأكد إنه ساري ٦ شهور)', 14], ['التأشيرة', 14], ['التأمين الطبي للسفر', 7], ['تبديل العملة أو تفعيل البطاقة للسفر', 3], ['شريحة أو باقة تجوال', 2], ['تجهيز الشنطة', 1], ['الحجوزات والتذاكر على الجوال', 1]];
  const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
  const DAY = 864e5;

  const st = { voice: { text: '', drafts: [], err: '', listening: false }, txMode: 'manual' };

  // ---------- الحسابات ----------
  const me = t => (t.members.find(m => m.me) || t.members[0] || { id: 'me' }).id;
  const mname = (t, id) => { const m = t.members.find(x => x.id === id); return m ? (m.me ? 'أنت' : m.name) : '؟'; };
  function shares(t, x) {
    // نصيب كل واحد من المصروف بالريال
    const out = {}; const ratio = x.amount ? x.sar / x.amount : 1;
    const sp = x.split || { mode: 'equal', ids: t.members.map(m => m.id) };
    if (sp.mode === 'custom') Object.keys(sp.custom || {}).forEach(id => { out[id] = (+sp.custom[id] || 0) * ratio; });
    else { const ids = (sp.ids && sp.ids.length) ? sp.ids : t.members.map(m => m.id); ids.forEach(id => { out[id] = x.sar / ids.length; }); }
    return out;
  }
  function paid(t, x) {
    const out = {}; const ratio = x.amount ? x.sar / x.amount : 1;
    const p = x.paid && Object.keys(x.paid).length ? x.paid : { [me(t)]: x.amount };
    Object.keys(p).forEach(id => { out[id] = (+p[id] || 0) * ratio; });
    return out;
  }
  function stats(t) {
    const list = S.tripTx(t.id);
    const bal = {}; t.members.forEach(m => { bal[m.id] = 0; });
    let total = 0, mine = 0; const byCat = {}, myByCat = {}, paidBy = {}, shareOf = {};
    const my = me(t);
    list.forEach(x => {
      if (x.kind === 'transfer') { bal[x.from] = (bal[x.from] || 0) + x.sar; bal[x.to] = (bal[x.to] || 0) - x.sar; return; }
      const sh = shares(t, x), pd = paid(t, x);
      Object.keys(pd).forEach(id => { bal[id] = (bal[id] || 0) + pd[id]; paidBy[id] = (paidBy[id] || 0) + pd[id]; });
      Object.keys(sh).forEach(id => { bal[id] = (bal[id] || 0) - sh[id]; shareOf[id] = (shareOf[id] || 0) + sh[id]; });
      total += x.sar; byCat[x.categoryId] = (byCat[x.categoryId] || 0) + x.sar;
      const m = sh[my] || 0; mine += m; myByCat[x.categoryId] = (myByCat[x.categoryId] || 0) + m;
    });
    return { list, bal, total, mine, byCat, myByCat, paidBy, shareOf };
  }
  function settle(bal) {
    // أقل عدد تحويلات
    const cr = [], db = [];
    Object.keys(bal).forEach(id => { const v = Math.round(bal[id] * 100) / 100; if (v > 0.5) cr.push({ id, v }); else if (v < -0.5) db.push({ id, v: -v }); });
    cr.sort((a, b) => b.v - a.v); db.sort((a, b) => b.v - a.v);
    const out = []; let i = 0, j = 0;
    while (i < db.length && j < cr.length) {
      const amt = Math.min(db[i].v, cr[j].v);
      out.push({ from: db[i].id, to: cr[j].id, sar: Math.round(amt) });
      db[i].v -= amt; cr[j].v -= amt;
      if (db[i].v < 0.5) i++; if (cr[j].v < 0.5) j++;
    }
    return out.filter(o => o.sar > 0);
  }
  function status(t) {
    const now = Date.now(), s = U.startOfDay(t.start), e = U.addDays(U.startOfDay(t.end), 1);
    if (now < s) { const d = Math.ceil((s - U.startOfDay(now)) / DAY); return { k: 'soon', txt: d === 1 ? 'بكرة السفر!' : d === 2 ? 'باقي يومين' : `باقي ${d} ${d <= 10 ? 'أيام' : 'يوم'}`, d }; }
    if (now < e) { const n = Math.floor((U.startOfDay(now) - s) / DAY) + 1, tot = Math.round((e - s) / DAY); return { k: 'now', txt: `اليوم ${n} من ${tot}`, n, tot }; }
    return { k: 'done', txt: 'انتهت' };
  }
  const tripDays = t => Math.max(1, Math.round((U.addDays(U.startOfDay(t.end), 1) - U.startOfDay(t.start)) / DAY));
  const fmtRange = t => `${new Date(t.start).getDate()} ${U.MONTHS[new Date(t.start).getMonth()]} – ${new Date(t.end).getDate()} ${U.MONTHS[new Date(t.end).getMonth()]} ${new Date(t.end).getFullYear()}`;
  const local = (t, sar) => { const r = S.settings.rates[t.currency] || 1; return t.currency === 'SAR' ? '' : ` ≈ ${U.money(sar / r)} ${SK.CURRENCY_NAMES[t.currency] || t.currency}`; };

  // ---------- الشاشات ----------
  function viewHome(ui) {
    const { header, tabs, esc } = ui;
    const trips = S.activeTrips().slice().sort((a, b) => a.start - b.start);
    const live = trips.filter(t => status(t).k !== 'done');
    const past = trips.filter(t => status(t).k === 'done').reverse();
    const card = t => {
      const s = status(t), x = stats(t);
      const pct = t.budget > 0 ? Math.min(100, Math.round(x.mine / t.budget * 100)) : 0;
      return `<a class="card trip-card ${s.k}" href="#/trip/${t.id}">
        <div class="trip-h"><span class="trip-icon">✈️</span><span class="grow"><b>${esc(t.name)}</b><small>${esc(t.dest || '')}${t.dest ? ' · ' : ''}${esc(fmtRange(t))}</small></span><span class="badge ${s.k === 'now' ? 'lv-urgent' : s.k === 'soon' ? 'ty-appointment' : 'lv-normal'}">${esc(s.txt)}</span></div>
        <div class="trip-m"><span>${t.members.length > 1 ? `👥 ${t.members.length} أشخاص · ` : ''}صرفت ${U.money(x.mine)} ر.س${t.budget > 0 ? ` من ${U.money(t.budget)}` : ''}</span></div>
        ${t.budget > 0 ? `<div class="track"><div style="width:${Math.max(2, pct)}%" class="${pct >= 100 ? 'over' : pct >= 80 ? 'near' : ''}"></div></div>` : ''}
      </a>`;
    };
    return `${header('سكرتيري')}
    <main class="wrap">
      ${tabs('travel')}
      ${live.length ? `<div class="grid">${live.map(card).join('')}</div>` : `<section class="card"><h2>✈️ ما عندك رحلات</h2><p class="muted">سوّ رحلة جديدة: ميزانيتها منفصلة عن مصروفك الشهري، ومعها أجندة بالتنبيهات، وقائمة تجهيز، وحساب جماعي لو مسافر مع أحد.</p></section>`}
      ${past.length ? `<h3 class="sub">رحلات سابقة</h3><div class="grid">${past.map(card).join('')}</div>` : ''}
    </main>
    <div class="bottom"><a class="btn primary big" href="#/trip/new">✈️ <span>رحلة جديدة</span></a></div>`;
  }

  function tripForm(ui, t) {
    const { esc } = ui;
    t = t || {};
    const start = t.start || U.addDays(U.startOfDay(Date.now()), 14);
    const end = t.end || U.addDays(start, 5);
    const others = (t.members || []).filter(m => !m.me);
    return `<form class="form" data-form="trip" onsubmit="return false">
      <label class="field"><span class="lbl">اسم الرحلة</span><input name="name" type="text" value="${esc(t.name || '')}" placeholder="مثلاً: رحلة إسطنبول" required></label>
      <label class="field"><span class="lbl">الوجهة</span><input name="dest" type="text" value="${esc(t.dest || '')}" placeholder="مثلاً: إسطنبول، تركيا"></label>
      <div class="two">
        <label class="field"><span class="lbl">من</span><input name="start" type="date" value="${U.inputDate(start)}"></label>
        <label class="field"><span class="lbl">إلى</span><input name="end" type="date" value="${U.inputDate(end)}"></label>
      </div>
      <div class="two">
        <label class="field"><span class="lbl">عملة البلد</span><select name="currency">${Object.keys(SK.CURRENCY_NAMES).map(c => `<option value="${c}" ${(t.currency || 'SAR') === c ? 'selected' : ''}>${SK.CURRENCY_NAMES[c]}</option>`).join('')}</select></label>
        <label class="field"><span class="lbl">ميزانيتك (ريال)</span><input name="budget" type="number" inputmode="numeric" min="0" value="${t.budget || ''}" placeholder="بدون حد"></label>
      </div>
      <small class="muted">الميزانية لحصتك أنت. ميزانية السفر منفصلة عن مصروفك الشهري. ولو عملة البلد مو موجودة، اختر الأقرب وعدّل سعرها من الإعدادات.</small>
      <div class="field"><span class="lbl">👥 مسافر مع أحد؟ (اختياري)</span>
        <div data-slot="members" class="members">${others.map(m => memberRow(esc, m)).join('')}</div>
        <button type="button" class="btn-sm outline" data-act="trip-add-member">+ أضف شخص</button>
        <small class="muted">لو أضفت أشخاص، يطلع لك "مين دفع" و"تقسيم المصاريف" والحساب النهائي.</small>
      </div>
      ${t.id ? '' : `<label class="perm"><span class="grow"><b>📋 أضف قائمة التجهيز الجاهزة</b><small>الجواز، التأشيرة، التأمين، العملة، الشنطة... مع تذكير قبلها</small></span><input type="checkbox" name="prep" checked style="width:24px;height:24px"></label>`}
    </form>`;
  }
  const memberRow = (esc, m) => `<div class="member-row" data-mid="${esc(m.id || '')}"><input type="text" name="mname" value="${esc(m.name || '')}" placeholder="الاسم" aria-label="اسم الشخص"><button type="button" class="btn-icon" data-act="trip-del-member" aria-label="شيل">✕</button></div>`;

  function readTripForm(ui, base) {
    const f = ui.$('form[data-form="trip"]');
    const name = f.name.value.trim();
    if (!name) { ui.toast('اكتب اسم الرحلة', 'err'); return null; }
    const start = U.fromInputs(f.start.value, '00:00'), end = U.fromInputs(f.end.value, '00:00');
    if (end < start) { ui.toast('تاريخ الرجوع قبل تاريخ السفر', 'err'); return null; }
    const old = (base && base.members) || [];
    const meM = old.find(m => m.me) || { id: 'me', name: 'أنا', me: true };
    const others = ui.$$('.member-row', f).map(r => ({ id: r.dataset.mid || ('m' + U.uid()), name: r.querySelector('input').value.trim() })).filter(m => m.name);
    return Object.assign({}, base || {}, { name, dest: f.dest.value.trim(), start, end, currency: f.currency.value, budget: Math.max(0, +f.budget.value || 0), members: [meM].concat(others) });
  }

  function subTabs(t, tab) {
    const tabs = [['overview', 'نظرة عامة'], ['agenda', 'الأجندة'], ['money', 'المصاريف']];
    if (t.members.length > 1) tabs.push(['settle', 'الحساب']);
    tabs.push(['prep', 'قبل السفر'], ['info', 'معلومات']);
    return `<nav class="subtabs" aria-label="أقسام الرحلة">${tabs.map(([k, n]) => `<a href="#/trip/${t.id}?tab=${k}" class="${tab === k ? 'on' : ''}">${n}</a>`).join('')}</nav>`;
  }

  function itemLine(ui, it) {
    const { esc, I } = ui;
    const k = KINDS[it.tripKind] || KINDS.activity;
    return `<div class="row-item ${it.done ? 'done' : ''} lvl-${it.level || 'normal'}">
      <button type="button" class="tick" data-act="toggle-done" data-id="${it.id}" aria-label="تم" aria-pressed="${!!it.done}">${I.check}</button>
      <a class="row-main" href="#/task/${it.id}"><span class="row-time">${it.timeSet !== false ? U.time(it.due) : ''}</span><span class="row-title">${k.icon} ${esc(it.title)}</span><span class="row-meta">${esc([SK.LEVEL_NAMES[it.level || 'normal'], it.place ? '📍 ' + it.place.name : null, it.note || null].filter(Boolean).join(' · '))}</span></a>
    </div>`;
  }

  function txLine(ui, t, x) {
    const { esc } = ui;
    if (x.kind === 'transfer') {
      return `<a class="tx" href="#/trip/${t.id}/tx/${x.id}"><span class="tx-main"><b>${x.transferType === 'settle' ? '🤝 سداد' : '💵 دفع مقدم'}: ${esc(mname(t, x.from))} ← ${esc(mname(t, x.to))}</b><small>${esc(U.dayRel(x.date))}</small></span><b class="tx-amt">${U.money(x.sar)}</b></a>`;
    }
    const c = cat(x.categoryId); const pd = paid(t, x); const sh = shares(t, x);
    const payers = Object.keys(pd).map(id => mname(t, id)).join(' و');
    const orig = x.currency !== 'SAR' ? `${U.money(x.amount, true)} ${SK.CURRENCY_NAMES[x.currency] || x.currency} · ` : '';
    return `<a class="tx" href="#/trip/${t.id}/tx/${x.id}"><span class="tx-main"><b>${c.icon} ${esc(x.title || c.name)}</b><small>${esc(orig)}${t.members.length > 1 ? 'دفع: ' + esc(payers) + ' · حصتك ' + U.money(sh[me(t)] || 0) + ' · ' : ''}${esc(U.dayRel(x.date))}</small></span><b class="tx-amt">${U.money(x.sar)}</b></a>`;
  }

  function viewTrip(ui, t, tab) {
    const { header, esc, I } = ui;
    const s = status(t), x = stats(t);
    const items = S.activeItems().filter(i => i.tripId === t.id).sort((a, b) => a.due - b.due);
    const agenda = items.filter(i => i.tripKind !== 'prep');
    const prep = items.filter(i => i.tripKind === 'prep');
    let body = '';
    if (tab === 'overview') {
      const left = t.budget > 0 ? t.budget - x.mine : null;
      const daysLeft = s.k === 'now' ? s.tot - s.n + 1 : s.k === 'soon' ? tripDays(t) : 0;
      const perDay = left != null && daysLeft > 0 ? left / daysLeft : null;
      const pct = t.budget > 0 ? Math.min(100, Math.round(x.mine / t.budget * 100)) : 0;
      const next = agenda.find(i => !i.done && i.due >= Date.now() - 36e5);
      const ranked = Object.keys(x.myByCat).map(id => ({ c: cat(id), v: x.myByCat[id] })).sort((a, b) => b.v - a.v);
      const max = ranked.length ? ranked[0].v : 1;
      const prepDone = prep.filter(i => i.done).length;
      body = `
        <section class="card dark">
          <span class="muted-l">${t.budget > 0 ? 'الباقي من ميزانيتك' : 'صرفت في هالرحلة'}</span>
          <div class="big-num">${U.money(t.budget > 0 ? left : x.mine)} <small>ر.س</small></div>
          ${t.budget > 0 ? `<div class="meter"><div style="width:${pct}%" class="${pct >= 90 ? 'hot' : ''}"></div></div>` : ''}
          <div class="two">
            <div><span class="muted-l">حصتك من المصاريف</span><b>${U.money(x.mine)}</b></div>
            <div><span class="muted-l">${perDay != null ? 'تقدر تصرف باليوم' : t.members.length > 1 ? 'مصاريف المجموعة' : 'الميزانية'}</span><b>${perDay != null ? U.money(Math.max(0, perDay)) : t.members.length > 1 ? U.money(x.total) : (t.budget ? U.money(t.budget) : '—')}</b></div>
          </div>
          ${t.currency !== 'SAR' && perDay != null ? `<span class="muted-l small">باليوم${local(t, Math.max(0, perDay))}</span>` : ''}
        </section>
        ${next ? `<section class="card"><h2>الجاي في الأجندة</h2>${itemLine(ui, next)}</section>` : ''}
        <section class="card"><h2>صرفك حسب البند</h2>
          ${ranked.length ? ranked.map(r => `<div class="catbar"><div class="catbar-h"><span>${r.c.icon} ${esc(r.c.name)}</span><b>${U.money(r.v)}</b></div><div class="track"><div style="width:${Math.max(2, r.v / max * 100)}%"></div></div></div>`).join('') : '<p class="empty">ما سجلت مصاريف للرحلة.</p>'}
        </section>
        ${prep.length ? `<a class="card" href="#/trip/${t.id}?tab=prep"><h2>📋 قبل السفر <small>${prepDone} من ${prep.length}</small></h2><div class="track"><div style="width:${Math.round(prepDone / prep.length * 100)}%"></div></div></a>` : ''}`;
    }
    if (tab === 'agenda') {
      const days = [];
      for (let d = U.startOfDay(t.start); d <= U.startOfDay(t.end); d = U.addDays(d, 1)) days.push(d);
      const before = agenda.filter(i => i.due < U.startOfDay(t.start));
      const after = agenda.filter(i => i.due >= U.addDays(U.startOfDay(t.end), 1));
      const sec = (title, list, day) => `<section class="card"><h2>${title}</h2>${list.length ? list.map(i => itemLine(ui, i)).join('') : '<p class="empty">فاضي.</p>'}${day != null ? `<a class="btn-link" href="#/task/new?mode=manual&trip=${t.id}&tk=activity&date=${day + 10 * 36e5}">+ أضف لهذا اليوم</a>` : ''}</section>`;
      body = `<div class="quick-add">
          <a class="btn-sm outline" href="#/task/new?mode=manual&trip=${t.id}&tk=flight&date=${U.startOfDay(t.start) + 10 * 36e5}">✈️ طيران</a>
          <a class="btn-sm outline" href="#/task/new?mode=manual&trip=${t.id}&tk=hotel&date=${U.startOfDay(t.start) + 15 * 36e5}">🏨 فندق</a>
          <a class="btn-sm outline" href="#/task/new?mode=manual&trip=${t.id}&tk=activity&date=${U.startOfDay(t.start) + 10 * 36e5}">🎯 نشاط</a>
          <a class="btn-sm" href="#/task/new?mode=voice&trip=${t.id}">${I.mic} بالصوت</a>
        </div>
        ${before.length ? sec('قبل السفر', before) : ''}
        ${days.map((d, k) => sec(`اليوم ${k + 1} <small>${esc(U.dateShort(d))}</small>`, agenda.filter(i => i.due >= d && i.due < U.addDays(d, 1)), d)).join('')}
        ${after.length ? sec('بعد الرحلة', after) : ''}`;
    }
    if (tab === 'money') {
      const list = x.list.slice().sort((a, b) => b.date - a.date || (b.createdAt || 0) - (a.createdAt || 0));
      body = `<section class="card"><h2>مصاريف الرحلة <small>${list.filter(l => l.kind !== 'transfer').length}</small></h2>
          <div class="two"><div><span class="muted">${t.members.length > 1 ? 'المجموعة كاملة' : 'المجموع'}</span><b>${U.money(x.total)} ر.س</b></div>${t.members.length > 1 ? `<div><span class="muted">حصتك</span><b>${U.money(x.mine)} ر.س</b></div>` : ''}</div>
          ${list.length ? list.map(l => txLine(ui, t, l)).join('') : '<p class="empty">ما فيه مصاريف. سجّل أول مصروف من تحت.</p>'}
        </section>
        ${t.members.length > 1 ? `<a class="btn outline" href="#/trip/${t.id}/tx/new?kind=transfer">💵 دفع مقدم أو تحويل بينكم</a>` : ''}`;
    }
    if (tab === 'settle') {
      const tr = settle(x.bal);
      body = `<section class="card"><h2>كل واحد كم دفع وكم عليه</h2>
          <div class="settle-table"><div class="st-h"><span>الشخص</span><span>دفع</span><span>عليه</span><span>الفرق</span></div>
          ${t.members.map(m => { const b = Math.round(x.bal[m.id] || 0); return `<div class="st-r"><b>${esc(m.me ? 'أنت' : m.name)}</b><span>${U.money(x.paidBy[m.id] || 0)}</span><span>${U.money(x.shareOf[m.id] || 0)}</span><b class="${b > 0 ? 'teal' : b < 0 ? 'red' : ''}">${b > 0 ? '+' : ''}${U.money(b)}</b></div>`; }).join('')}
          </div>
          <small class="muted">"الفرق" يحسب الدفع المقدم والتحويلات. الموجب: له فلوس. السالب: عليه فلوس.</small>
        </section>
        <section class="card"><h2>🤝 التسوية</h2>
          ${tr.length ? tr.map(o => `<div class="settle-row"><span class="grow"><span>${o.from === me(t) ? `<b>أنت</b> تحوّل لـ <b>${esc(mname(t, o.to))}</b>` : o.to === me(t) ? `<b>${esc(mname(t, o.from))}</b> يحوّل <b>لك</b>` : `<b>${esc(mname(t, o.from))}</b> يحوّل لـ <b>${esc(mname(t, o.to))}</b>`}</span><small>${U.money(o.sar)} ر.س${esc(local(t, o.sar))}</small></span><button type="button" class="btn-sm" data-act="trip-settle" data-trip="${t.id}" data-from="${o.from}" data-to="${o.to}" data-sar="${o.sar}">سدّد</button></div>`).join('') : '<p class="empty">الحساب متعادل، ما على أحد شي 👍</p>'}
        </section>`;
    }
    if (tab === 'prep') {
      body = `<section class="card"><h2>📋 قبل السفر <small>${prep.filter(i => i.done).length} من ${prep.length}</small></h2>
          ${prep.length ? prep.map(i => itemLine(ui, i)).join('') : '<p class="empty">ما فيه قائمة.</p>'}
          <div class="add-cat"><input name="prepTitle" type="text" placeholder="أضف شي (مثلاً: شاحن متنقل)" aria-label="شي جديد للتجهيز"><select name="prepDays" aria-label="متى أذكرك">${[[0, 'يوم السفر'], [1, 'قبل بيوم'], [2, 'قبل يومين'], [3, 'قبل ٣ أيام'], [7, 'قبل أسبوع'], [14, 'قبل أسبوعين']].map(([v, n]) => `<option value="${v}" ${v === 1 ? 'selected' : ''}>${n}</option>`).join('')}</select><button type="button" class="btn-sm" data-act="trip-prep-add" data-trip="${t.id}">أضف</button></div>
          ${prep.length ? '' : `<button type="button" class="btn-sm outline" data-act="trip-prep-default" data-trip="${t.id}">أضف القائمة الجاهزة</button>`}
        </section>`;
    }
    if (tab === 'info') {
      body = `<section class="card"><h2>معلومات الرحلة</h2>
          <p class="muted">أرقام الحجوزات، عنوان الفندق، أرقام الطوارئ، السفارة... كلها محفوظة على جوالك وتفتح بدون نت.</p>
          <textarea name="tripInfo" rows="12" placeholder="مثلاً:&#10;حجز الطيران: ABC123&#10;الفندق: ...&#10;السفارة السعودية: ...">${esc(t.info || '')}</textarea>
          <button type="button" class="btn-sm" data-act="trip-info-save" data-trip="${t.id}">حفظ</button>
        </section>`;
    }
    const showBottom = tab === 'overview' || tab === 'money';
    return `${header(t.name, '#/travel')}
      <main class="wrap narrow">
        <div class="trip-top"><span class="badge ${s.k === 'now' ? 'lv-urgent' : s.k === 'soon' ? 'ty-appointment' : 'lv-normal'}">${esc(s.txt)}</span><span class="muted">${esc(t.dest || '')} · ${esc(fmtRange(t))}${t.members.length > 1 ? ' · 👥 ' + t.members.length : ''}</span><a class="btn-link" href="#/trip/${t.id}/edit">تعديل</a></div>
        ${subTabs(t, tab)}
        ${body}
      </main>
      ${showBottom ? `<div class="bottom"><a class="btn primary big" href="#/trip/${t.id}/tx/new?mode=voice">${I.mic}<span>سجّل مصروف للرحلة</span></a><a class="btn ghost" href="#/trip/${t.id}/tx/new">يدوي</a></div>` : ''}`;
  }

  // ---------- نموذج مصروف الرحلة ----------
  function txForm(ui, t, x, kindParam) {
    const { esc, chips } = ui;
    x = x || {};
    const kind = x.kind || kindParam || 'expense';
    const group = t.members.length > 1;
    const people = t.members.map(m => ({ v: m.id, t: m.me ? 'أنت' : m.name }));
    if (kind === 'transfer') {
      return `<form class="form" data-form="ttx" data-kind="transfer" onsubmit="return false">
        <div class="field"><span class="lbl">النوع</span>${chips('ttype', [{ v: 'advance', t: 'دفع مقدم' }, { v: 'settle', t: 'سداد' }], x.transferType || 'advance')}</div>
        <div class="two">
          <label class="field"><span class="lbl">من</span><select name="from">${t.members.map(m => `<option value="${m.id}" ${x.from === m.id ? 'selected' : ''}>${esc(m.me ? 'أنت' : m.name)}</option>`).join('')}</select></label>
          <label class="field"><span class="lbl">إلى</span><select name="to">${t.members.map((m, k) => `<option value="${m.id}" ${(x.to ? x.to === m.id : k === 0) ? 'selected' : ''}>${esc(m.me ? 'أنت' : m.name)}</option>`).join('')}</select></label>
        </div>
        <div class="two amt"><label class="field"><span class="lbl">المبلغ</span><input name="amount" type="text" inputmode="decimal" value="${x.amount != null ? esc(x.amount) : ''}" required></label>
          <label class="field"><span class="lbl">العملة</span><select name="currency">${Object.keys(SK.CURRENCY_NAMES).map(c => `<option value="${c}" ${(x.currency || t.currency) === c ? 'selected' : ''}>${SK.CURRENCY_NAMES[c]}</option>`).join('')}</select></label></div>
        <small class="muted">دفع مقدم: لما واحد يعطي اللي ماسك فلوس الرحلة مبلغ. سداد: لما واحد يرجّع اللي عليه.</small>
        <label class="field"><span class="lbl">التاريخ</span><input name="date" type="date" value="${U.inputDate(x.date || Date.now())}"></label>
      </form>`;
    }
    const sp = x.split || { mode: 'equal', ids: t.members.map(m => m.id) };
    const pd = x.paid && Object.keys(x.paid).length ? x.paid : { [me(t)]: '' };
    return `<form class="form" data-form="ttx" data-kind="expense" onsubmit="return false">
      <div class="two amt"><label class="field"><span class="lbl">المبلغ</span><input name="amount" type="text" inputmode="decimal" value="${x.amount != null ? esc(x.amount) : ''}" placeholder="0" required></label>
        <label class="field"><span class="lbl">العملة</span><select name="currency">${Object.keys(SK.CURRENCY_NAMES).map(c => `<option value="${c}" ${(x.currency || t.currency) === c ? 'selected' : ''}>${SK.CURRENCY_NAMES[c]}</option>`).join('')}</select></label></div>
      <div class="field"><span class="lbl">البند</span>${chips('tcat', CATS.map(c => ({ v: c.id, t: c.icon + ' ' + c.name })), x.categoryId || 'food', 'wrap3')}</div>
      <label class="field"><span class="lbl">الاسم (اختياري)</span><input name="title" type="text" value="${esc(x.title || '')}" placeholder="مثلاً: عشا في المطعم"></label>
      ${group ? `
      <div class="field"><span class="lbl">مين دفع؟ (تقدر تختار أكثر من واحد)</span>
        <div class="chips wrap3">${people.map(p => `<button type="button" class="chip" data-act="ttx-payer" data-id="${p.v}" aria-pressed="${p.v in pd}">${esc(p.t)}</button>`).join('')}</div>
        <div data-slot="payers" class="split-inputs">${Object.keys(pd).length > 1 ? Object.keys(pd).map(id => `<label class="split-in"><span>${esc(mname(t, id))} دفع</span><input type="number" step="0.01" inputmode="decimal" data-paid="${id}" value="${esc(pd[id])}"></label>`).join('') : ''}</div>
      </div>
      <div class="field"><span class="lbl">يتقسم على</span>
        <div class="chips wrap3">${people.map(p => `<button type="button" class="chip" data-act="ttx-member" data-id="${p.v}" aria-pressed="${sp.mode === 'custom' ? (p.v in (sp.custom || {})) : (sp.ids || []).includes(p.v)}">${esc(p.t)}</button>`).join('')}</div>
        ${chips('smode', [{ v: 'equal', t: 'بالتساوي' }, { v: 'custom', t: 'مبالغ أحددها' }], sp.mode || 'equal', 'small-chips')}
        <div data-slot="custom" class="split-inputs" ${sp.mode === 'custom' ? '' : 'hidden'}>${t.members.map(m => `<label class="split-in"><span>${esc(m.me ? 'أنت' : m.name)}</span><input type="number" step="0.01" inputmode="decimal" data-custom="${m.id}" value="${sp.custom && sp.custom[m.id] != null ? esc(sp.custom[m.id]) : ''}" placeholder="0"></label>`).join('')}</div>
        <small class="muted">المبالغ بنفس عملة المصروف.</small>
      </div>` : ''}
      <label class="field"><span class="lbl">التاريخ</span><input name="date" type="date" value="${U.inputDate(x.date || Date.now())}"></label>
      <label class="field"><span class="lbl">ملاحظة (اختياري)</span><input name="note" type="text" value="${esc(x.note || '')}"></label>
    </form>`;
  }
  const num = v => parseFloat(String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[,٬]/g, '').replace('٫', '.'));

  function readTxForm(ui, t, base) {
    const f = ui.$('form[data-form="ttx"]');
    const amount = num(f.amount.value);
    if (!(amount > 0)) { ui.toast('اكتب المبلغ', 'err'); return null; }
    const d = new Date(U.fromInputs(f.date.value, '12:00')); if (U.startOfDay(d) === U.startOfDay(Date.now())) d.setTime(Date.now());
    const o = Object.assign({}, base || {}, { tripId: t.id, amount, currency: f.currency.value, date: d.getTime() });
    if (f.dataset.kind === 'transfer') {
      if (f.from.value === f.to.value) { ui.toast('اختر شخصين مختلفين', 'err'); return null; }
      return Object.assign(o, { kind: 'transfer', transferType: ui.chipVal(f, 'ttype') || 'advance', from: f.from.value, to: f.to.value, categoryId: 'other', title: 'تحويل' });
    }
    const c = ui.chipVal(f, 'tcat') || 'other';
    Object.assign(o, { kind: 'expense', categoryId: c, title: f.title.value.trim() || cat(c).name, note: f.note.value.trim() });
    if (t.members.length > 1) {
      const payers = ui.$$('[data-act="ttx-payer"][aria-pressed="true"]', f).map(b => b.dataset.id);
      if (!payers.length) { ui.toast('اختر مين دفع', 'err'); return null; }
      const paidM = {};
      if (payers.length === 1) paidM[payers[0]] = amount;
      else {
        let sum = 0; payers.forEach(id => { const i = ui.$(`[data-paid="${id}"]`, f); const v = num(i && i.value) || 0; paidM[id] = v; sum += v; });
        if (Math.abs(sum - amount) > 0.5) { ui.toast(`مجموع اللي دفعوه (${U.money(sum, true)}) لازم يساوي المبلغ (${U.money(amount, true)})`, 'err'); return null; }
      }
      const mode = ui.chipVal(f, 'smode') || 'equal';
      const ids = ui.$$('[data-act="ttx-member"][aria-pressed="true"]', f).map(b => b.dataset.id);
      if (mode === 'equal') {
        if (!ids.length) { ui.toast('اختر على مين يتقسم', 'err'); return null; }
        o.split = { mode: 'equal', ids };
      } else {
        const custom = {}; let sum = 0;
        ui.$$('[data-custom]', f).forEach(i => { const v = num(i.value) || 0; if (v > 0) { custom[i.dataset.custom] = v; sum += v; } });
        if (Math.abs(sum - amount) > 0.5) { ui.toast(`مجموع التقسيم (${U.money(sum, true)}) لازم يساوي المبلغ (${U.money(amount, true)})`, 'err'); return null; }
        o.split = { mode: 'custom', custom };
      }
      o.paid = paidM;
    } else { o.paid = { [me(t)]: amount }; o.split = { mode: 'equal', ids: [me(t)] }; }
    return o;
  }

  function viewTx(ui, t, txId, params) {
    const { header, esc, chips, I } = ui;
    const x = txId && txId !== 'new' ? S.getTx(txId) : null;
    const back = `#/trip/${t.id}?tab=money`;
    if (x) {
      return `${header('تعديل', back)}<main class="wrap narrow">${txForm(ui, t, x)}
        <div class="bottom inline col"><button type="button" class="btn primary big" data-act="ttx-save" data-trip="${t.id}" data-id="${x.id}">حفظ التعديل</button>
        <button type="button" class="btn danger" data-act="ttx-del" data-trip="${t.id}" data-id="${x.id}">حذف</button></div></main>`;
    }
    if (params.kind === 'transfer') {
      return `${header('دفع مقدم أو تحويل', back)}<main class="wrap narrow">${txForm(ui, t, null, 'transfer')}
        <div class="bottom inline"><button type="button" class="btn primary big" data-act="ttx-save" data-trip="${t.id}">حفظ</button></div></main>`;
    }
    const mode = params.mode === 'voice' ? 'voice' : 'manual';
    const v = st.voice;
    const ex = t.members.length > 1 ? `مثلاً: "${(t.members.find(m => !m.me) || {}).name || 'أحمد'} دفع العشا أربعمية، وأنا دفعت التاكسي مية وخمسين"` : 'مثلاً: "تعشيت بأربعمية، وتاكسي مية وخمسين"';
    return `${header('مصروف للرحلة', back)}<main class="wrap narrow">
      <nav class="chips seg-chips"><a class="chip" href="#/trip/${t.id}/tx/new?mode=voice" aria-pressed="${mode === 'voice'}">بالصوت</a><a class="chip" href="#/trip/${t.id}/tx/new" aria-pressed="${mode === 'manual'}">يدوي</a></nav>
      ${mode === 'voice' ? `
        <section class="voice">
          <button type="button" class="mic ${v.listening ? 'on' : ''}" data-act="ttx-listen" data-trip="${t.id}" aria-label="اضغط وتكلم">${I.mic}</button>
          <p class="mic-hint">${v.listening ? 'أسمعك...' : 'اضغط وتكلم. العملة الافتراضية: ' + esc(SK.CURRENCY_NAMES[t.currency] || t.currency)}</p>
          ${v.err ? `<p class="err-msg">${esc(v.err)}</p>` : ''}
          <label class="field"><span class="lbl">${v.text ? 'قلت:' : 'أو اكتب'}</span><textarea name="tvtext" rows="3" placeholder="${esc(ex)}">${esc(v.text)}</textarea></label>
          <button type="button" class="btn outline" data-act="ttx-parse" data-trip="${t.id}">حلّل</button>
        </section>
        ${v.drafts.length ? `<h3 class="sub">فهمت منك:</h3>${v.drafts.map((d, i) => `<div class="draft tx-draft"><div class="draft-h"><span class="grow"><b>${cat(d.categoryId).icon} ${esc(d.title)}</b><small>${t.members.length > 1 ? 'دفع: ' + esc(mname(t, Object.keys(d.paid)[0])) + ' · يتقسم بالتساوي على الكل' : esc(cat(d.categoryId).name)}</small></span><b class="draft-amt">${U.money(d.amount, true)} ${esc(SK.CURRENCY_NAMES[d.currency] || d.currency)}</b></div><div class="draft-acts"><button type="button" class="btn-icon" data-act="ttx-drop" data-i="${i}" aria-label="احذف">✕</button></div></div>`).join('')}
          <div class="bottom inline"><button type="button" class="btn primary big" data-act="ttx-save-drafts" data-trip="${t.id}">تأكيد وحفظ</button></div>
          <p class="muted center">بعد الحفظ تقدر تعدّل أي واحد (مين دفع وكيف يتقسم) من قائمة المصاريف</p>` : ''}
      ` : `${txForm(ui, t, null)}<div class="bottom inline"><button type="button" class="btn primary big" data-act="ttx-save" data-trip="${t.id}">حفظ</button></div>`}
    </main>`;
  }

  // ---------- التوجيه ----------
  function handles(r) { return r.name === 'travel' || r.name === 'trip'; }
  function isForm(r) { return r.name === 'trip' && (r.parts[1] === 'new' || r.parts[2] === 'edit' || r.parts[2] === 'tx' || r.params.tab === 'info'); }
  function view(r, ui) {
    if (r.name === 'travel') return viewHome(ui);
    if (r.parts[1] === 'new') return `${ui.header('رحلة جديدة', '#/travel')}<main class="wrap narrow">${tripForm(ui)}<div class="bottom inline"><button type="button" class="btn primary big" data-act="trip-save">حفظ الرحلة</button></div></main>`;
    const t = S.getTrip(r.parts[1]);
    if (!t || t.deleted) return `${ui.header('الرحلة', '#/travel')}<main class="wrap narrow"><p class="empty">الرحلة محذوفة.</p></main>`;
    if (r.parts[2] === 'edit') return `${ui.header('تعديل الرحلة', '#/trip/' + t.id)}<main class="wrap narrow">${tripForm(ui, t)}<div class="bottom inline col"><button type="button" class="btn primary big" data-act="trip-save" data-id="${t.id}">حفظ</button><button type="button" class="btn danger" data-act="trip-del" data-id="${t.id}">حذف الرحلة</button></div></main>`;
    if (r.parts[2] === 'tx') return viewTx(ui, t, r.parts[3], r.params);
    return viewTrip(ui, t, r.params.tab || 'overview');
  }

  function addPrep(t, title, days) {
    const d = new Date(U.addDays(U.startOfDay(t.start), -days)); d.setHours(20, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setTime(Math.max(Date.now() + 36e5, d.getTime()));
    S.putItem({ type: 'task', title, level: days >= 7 ? 'important' : 'normal', due: d.getTime(), timeSet: true, before: 0, repeat: 'none', done: false, tripId: t.id, tripKind: 'prep' });
  }

  // ---------- الأوامر ----------
  const actions = {
    'trip-add-member'() { const ui = SK.ui; const box = ui.$('[data-slot="members"]'); box.insertAdjacentHTML('beforeend', memberRow(ui.esc, {})); const ins = ui.$$('input', box); ins[ins.length - 1].focus(); },
    'trip-del-member'(d, el) { el.closest('.member-row').remove(); },
    'trip-save'(d) {
      const ui = SK.ui; const base = d.id ? S.getTrip(d.id) : null;
      const t = readTripForm(ui, base); if (!t) return;
      const wantPrep = !base && ui.$('[name="prep"]') && ui.$('[name="prep"]').checked;
      const saved = S.putTrip(t);
      if (wantPrep) PREP.forEach(([title, days]) => addPrep(saved, title, days));
      ui.toast('تم الحفظ', 'ok'); ui.go('#/trip/' + saved.id);
    },
    'trip-del'(d) { if (!confirm('تحذف الرحلة وكل أجندتها؟ (المصاريف تنحذف معها)')) return; S.tripTx(d.id).forEach(x => S.removeTx(x.id)); S.removeTrip(d.id); SK.ui.go('#/travel'); },
    'trip-info-save'(d) { const t = S.getTrip(d.trip); t.info = SK.ui.$('[name="tripInfo"]').value; S.putTrip(t); SK.ui.toast('تم الحفظ', 'ok'); },
    'trip-prep-add'(d) { const ui = SK.ui; const title = ui.$('[name="prepTitle"]').value.trim(); if (!title) return; addPrep(S.getTrip(d.trip), title, +ui.$('[name="prepDays"]').value); },
    'trip-prep-default'(d) { const t = S.getTrip(d.trip); PREP.forEach(([title, days]) => addPrep(t, title, days)); },
    'trip-settle'(d) {
      const t = S.getTrip(d.trip);
      if (!confirm(`تسجّل إن ${mname(t, d.from)} حوّل ${U.money(+d.sar)} ريال لـ ${mname(t, d.to)}؟`)) return;
      S.putTx({ tripId: t.id, kind: 'transfer', transferType: 'settle', from: d.from, to: d.to, amount: +d.sar, currency: 'SAR', date: Date.now(), categoryId: 'other', title: 'سداد' });
      SK.ui.toast('انسجل السداد', 'ok');
    },
    'ttx-payer'(d, el) {
      const ui = SK.ui; el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true'));
      const f = el.closest('form'); const t = S.getTrip(ui.route().parts[1]);
      const ids = ui.$$('[data-act="ttx-payer"][aria-pressed="true"]', f).map(b => b.dataset.id);
      const old = {}; ui.$$('[data-paid]', f).forEach(i => { old[i.dataset.paid] = i.value; });
      ui.$('[data-slot="payers"]', f).innerHTML = ids.length > 1 ? ids.map(id => `<label class="split-in"><span>${ui.esc(mname(t, id))} دفع</span><input type="number" step="0.01" inputmode="decimal" data-paid="${id}" value="${ui.esc(old[id] || '')}"></label>`).join('') : '';
    },
    'ttx-member'(d, el) { el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true')); },
    'ttx-save'(d) {
      const ui = SK.ui; const t = S.getTrip(d.trip);
      const x = readTxForm(ui, t, d.id ? S.getTx(d.id) : null); if (!x) return;
      S.putTx(x); ui.toast('تم الحفظ', 'ok'); ui.go(`#/trip/${t.id}?tab=money`);
    },
    'ttx-del'(d) { if (!confirm('تحذفه؟')) return; S.removeTx(d.id); SK.ui.go(`#/trip/${d.trip}?tab=money`); },
    'ttx-listen'(d) {
      const ui = SK.ui; if (st.voice.listening) return;
      st.voice.listening = true; st.voice.err = ''; ui.render();
      SK.native.startVoice((text, err) => {
        st.voice.listening = false;
        if (text) { st.voice.text = text; actions['ttx-parse'](d, null, true); } else { st.voice.err = err || ''; ui.render(); }
      });
    },
    'ttx-parse'(d, el, fromVoice) {
      const ui = SK.ui; const t = S.getTrip(d.trip);
      if (!fromVoice) { const ta = ui.$('[name="tvtext"]'); st.voice.text = ta ? ta.value.trim() : ''; }
      const res = Parser.parseFinance(st.voice.text, { categories: CATS, defaultCurrency: t.currency });
      st.voice.drafts = res.map(r => {
        // لو ذكر اسم واحد من المجموعة: هو اللي دفع
        const src = Parser.norm(r.source || '');
        const who = t.members.find(m => !m.me && m.name && src.includes(Parser.norm(m.name)));
        const c = CATS.some(c => c.id === r.categoryId) ? r.categoryId : 'other';
        return { tripId: t.id, kind: 'expense', amount: r.amount, currency: r.currency, categoryId: c, title: r.title && r.title !== 'أخرى' ? r.title : cat(c).name, date: r.date, note: '', paid: { [who ? who.id : me(t)]: r.amount }, split: { mode: 'equal', ids: t.members.map(m => m.id) } };
      });
      if (st.voice.text && !st.voice.drafts.length) st.voice.err = 'ما لقيت مبلغ في الجملة. جرب مرة ثانية أو استخدم اليدوي.';
      ui.render();
    },
    'ttx-drop'(d) { st.voice.drafts.splice(+d.i, 1); SK.ui.render(); },
    'ttx-save-drafts'(d) {
      const n = st.voice.drafts.length;
      st.voice.drafts.forEach(x => S.putTx(Object.assign({}, x)));
      st.voice = { text: '', drafts: [], err: '', listening: false };
      SK.ui.toast(`تم حفظ ${n}`, 'ok'); SK.ui.go(`#/trip/${d.trip}?tab=money`);
    }
  };

  function onRoute(r) {
    if (r.name === 'trip' && r.parts[2] === 'tx' && r.parts[3] === 'new') st.voice = { text: '', drafts: [], err: '', listening: false };
  }
  // مصاريف السفر (حصتك) في فترة: للسطر في صفحة المالية
  function shareIn(from, to) {
    let sum = 0;
    S.activeTrips().forEach(t => S.tripTx(t.id).forEach(x => { if (x.kind !== 'transfer' && x.date >= from && x.date < to) sum += shares(t, x)[me(t)] || 0; }));
    return sum;
  }
  // تغيير حالة الأيام/التقسيم المخصص
  document.addEventListener('click', e => {
    const b = e.target.closest('.chip[data-group="smode"]'); if (!b) return;
    setTimeout(() => { const f = b.closest('form'); const box = f && f.querySelector('[data-slot="custom"]'); if (box) box.hidden = b.dataset.val !== 'custom'; }, 0);
  });

  SK.travel = { handles, isForm, view, actions, onRoute, shareIn, KINDS, tripName: id => { const t = S.getTrip(id); return t ? t.name : ''; }, _stats: stats, _settle: settle };
})();
