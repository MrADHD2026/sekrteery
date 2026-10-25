/* سكرتيري — محلل الكلام العربي (مصروفات + مواعيد ومهام)
   يشتغل بدون إنترنت، بقواعد مكتوبة للهجة الخليجية/الحجازية والفصحى. */
(function (root) {
  'use strict';

  // ---------- تطبيع النص ----------
  function norm(s) {
    return String(s || '')
      .replace(/[ً-ْـ]/g, '')       // تشكيل وتطويل
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/٫/g, '.')
      .replace(/٬/g, ',')
      .toLowerCase();
  }

  function tokenize(text) {
    // يحافظ على النص الأصلي لكل كلمة، ويعطي نسخة مطبّعة
    const out = [];
    const re = /[^\s،,؛;.!?؟:]+(?::\d+)?|[،,؛;.!?؟]/g;
    let m;
    const src = String(text || '').replace(/(\d)[,٬](\d{3})/g, '$1$2');
    while ((m = re.exec(src))) {
      const raw = m[0];
      out.push({ raw, n: norm(raw), punct: /^[،,؛;.!?؟]$/.test(raw) });
    }
    return out;
  }

  // ---------- الأرقام بالكلمات ----------
  const UNITS = {
    'صفر': 0, 'واحد': 1, 'وحده': 1, 'واحده': 1, 'اثنين': 2, 'اثنان': 2, 'ثنين': 2, 'اتنين': 2, 'اثنتين': 2,
    'ثلاث': 3, 'ثلاثه': 3, 'تلات': 3, 'تلاته': 3, 'ثلاثا': 3, 'اربع': 4, 'اربعه': 4,
    'خمس': 5, 'خمسه': 5, 'ست': 6, 'سته': 6, 'سبع': 7, 'سبعه': 7,
    'ثمان': 8, 'ثمانيه': 8, 'ثمنيه': 8, 'تمانيه': 8, 'ثماني': 8, 'تسع': 9, 'تسعه': 9,
    'عشر': 10, 'عشره': 10,
    'احدعش': 11, 'حداش': 11, 'احداش': 11, 'حدعش': 11, 'احدعشر': 11,
    'اثنعش': 12, 'اطنعش': 12, 'اثناعش': 12, 'اثنعشر': 12, 'طنعش': 12, 'اتناشر': 12,
    'ثلطعش': 13, 'ثلاثطعش': 13, 'تلتاشر': 13, 'اربعطعش': 14, 'اربعتاشر': 14,
    'خمسطعش': 15, 'خمستاشر': 15, 'ستطعش': 16, 'سطعش': 16, 'سبعطعش': 17, 'ثمنطعش': 18, 'ثمانطعش': 18, 'تسعطعش': 19,
    'عشرين': 20, 'عشرون': 20, 'ثلاثين': 30, 'ثلاثون': 30, 'تلاتين': 30, 'اربعين': 40, 'اربعون': 40,
    'خمسين': 50, 'خمسون': 50, 'ستين': 60, 'ستون': 60, 'سبعين': 70, 'سبعون': 70,
    'ثمانين': 80, 'ثمانون': 80, 'تمانين': 80, 'تسعين': 90, 'تسعون': 90
  };
  const HUNDREDS = {
    'ميه': 100, 'مية': 100, 'مائه': 100, 'مئه': 100, 'ميت': 100, 'مئة': 100,
    'ميتين': 200, 'مئتين': 200, 'مائتين': 200, 'متين': 200, 'مئتان': 200, 'مائتان': 200,
    'ثلاثميه': 300, 'ثلثميه': 300, 'تلتميه': 300, 'ثلاثمائه': 300, 'ثلاثمئه': 300,
    'اربعميه': 400, 'ربعميه': 400, 'اربعمائه': 400, 'اربعمئه': 400,
    'خمسميه': 500, 'خمسمائه': 500, 'خمسمئه': 500, 'ستميه': 600, 'ستمائه': 600, 'ستمئه': 600,
    'سبعميه': 700, 'سبعمائه': 700, 'سبعمئه': 700, 'ثمنميه': 800, 'ثمانميه': 800, 'ثمانمائه': 800, 'ثمانمئه': 800,
    'تسعميه': 900, 'تسعمائه': 900, 'تسعمئه': 900
  };
  const THOUSAND = { 'الف': 1, 'الاف': 1, 'آلاف': 1, 'تلاف': 1, 'الافه': 1, 'الفين': 2, 'الفان': 2 };
  const MILLION = { 'مليون': 1, 'ملايين': 1, 'مليونين': 2 };
  const HALF = { 'نص': 0.5, 'نصف': 0.5, 'ربع': 0.25 };

  function stripPrefix(w) {
    // يشيل حروف الجر الملتصقة: و، ب، بـ، ل، ف
    const c = [];
    if (/^و./.test(w)) c.push(w.slice(1));
    if (/^(ب|ل|ف)./.test(w)) c.push(w.slice(1));
    if (/^(وب|ول|فب)./.test(w)) c.push(w.slice(2));
    if (/^بال./.test(w)) c.push(w.slice(3));
    return c;
  }

  function numInfo(w) {
    // يرجّع {kind, v} لكلمة رقمية واحدة أو null
    const tryOne = (x) => {
      if (/^\d+(\.\d+)?$/.test(x)) return { kind: 'digit', v: parseFloat(x) };
      if (/^\d+(\.\d+)?(الف|الاف|k)$/.test(x)) return { kind: 'digit', v: parseFloat(x) * 1000 };
      if (x in UNITS) return { kind: 'unit', v: UNITS[x] };
      if (x in HUNDREDS) return { kind: 'hundred', v: HUNDREDS[x] };
      if (x in THOUSAND) return { kind: 'thousand', v: THOUSAND[x] };
      if (x in MILLION) return { kind: 'million', v: MILLION[x] };
      if (x in HALF) return { kind: 'half', v: HALF[x] };
      return null;
    };
    let r = tryOne(w);
    if (r) return r;
    for (const s of stripPrefix(w)) { r = tryOne(s); if (r) return r; }
    return null;
  }

  // يبحث عن أول مبلغ في مجموعة كلمات؛ يرجّع {value, start, end}
  function findAmounts(tokens) {
    const res = [];
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      const info = t.punct ? null : numInfo(t.n);
      if (!info || info.kind === 'half') { i++; continue; }
      let total = 0, cur = 0, j = i, last = null;
      while (j < tokens.length) {
        const tk = tokens[j];
        if (tk.punct) break;
        const inf = numInfo(tk.n);
        if (!inf) break;
        if (inf.kind === 'digit') { if (last && last.kind === 'digit') break; cur += inf.v; }
        else if (inf.kind === 'unit') {
          if (last && (last.kind === 'unit' || last.kind === 'digit') && !/^و/.test(tk.n) && inf.v < 10) break;
          cur += inf.v;
        }
        else if (inf.kind === 'hundred') { cur = (inf.v === 100 && cur > 0 && cur < 10) ? cur * 100 : cur + inf.v; }
        else if (inf.kind === 'thousand') {
          const base = inf.v === 2 && cur === 0 ? 2 : (cur || 1);
          total += base * 1000; cur = 0;
        }
        else if (inf.kind === 'million') { total += (cur || inf.v) * 1e6; cur = 0; }
        else if (inf.kind === 'half') {
          if (!last) break;
          // "الف ونص" = 1500 ، "مية ونص" = 150
          const unit = last.kind === 'thousand' ? 1000 : last.kind === 'million' ? 1e6 : last.kind === 'hundred' ? 100 : 0;
          if (!unit) break;
          if (last.kind === 'hundred') cur += 100 * inf.v; else total += unit * inf.v;
        }
        last = inf;
        j++;
      }
      const value = total + cur;
      if (value > 0) res.push({ value, start: i, end: j });
      i = j > i ? j : i + 1;
    }
    return res;
  }

  // ---------- العملات ----------
  const CURRENCIES = [
    { code: 'SAR', words: ['ريال', 'ريالات', 'رس', 'ر.س', 'sar', 'سعودي'] },
    { code: 'USD', words: ['دولار', 'دولارات', '$', 'usd', 'دولار امريكي'] },
    { code: 'TRY', words: ['ليره', 'ليرات', 'ليرا', 'tl', 'try', 'تركي', 'تركيه'] },
    { code: 'EUR', words: ['يورو', 'eur', '€'] },
    { code: 'AED', words: ['درهم', 'دراهم', 'aed'] },
    { code: 'EGP', words: ['جنيه', 'جنيهات', 'egp'] }
  ];
  function findCurrency(tokens) {
    for (let i = 0; i < tokens.length; i++) {
      const cands = [tokens[i].n, ...stripPrefix(tokens[i].n)];
      for (const c of CURRENCIES) {
        if (cands.some(x => c.words.includes(x))) {
          // "ليره تركيه" / "ريال سعودي": نستهلك الكلمة اللي بعدها لو كانت وصف
          return { code: c.code, idx: i };
        }
      }
      if (/\$/.test(tokens[i].raw)) return { code: 'USD', idx: i };
    }
    return null;
  }

  // ---------- البنود ----------
  const DEFAULT_CATEGORIES = [
    { id: 'groceries', name: 'المقاضي', kind: 'expense', words: ['مقاضي', 'مقاضى', 'بقاله', 'سوبرماركت', 'سوبر', 'هايبر', 'خضار', 'خضره', 'تموين', 'بنده', 'الدانوب', 'دانوب', 'لولو', 'العثيم', 'عثيم', 'تميمي', 'كارفور', 'فواكه', 'لحم', 'دجاج'] },
    { id: 'fuel', name: 'البنزين والمواصلات', kind: 'expense', words: ['بنزين', 'وقود', 'محطه', 'تعبئه', 'عبيت', 'اوبر', 'كريم', 'تاكسي', 'مواصلات', 'باص', 'قطار', 'مواقف', 'غسيل'] },
    { id: 'food', name: 'المطاعم والقهوة', kind: 'expense', words: ['مطعم', 'مطاعم', 'غدا', 'غداء', 'عشا', 'عشاء', 'فطور', 'قهوه', 'كوفي', 'كافيه', 'ستاربكس', 'مندي', 'برجر', 'بيتزا', 'شاورما', 'هنقرستيشن', 'جاهز', 'طلبات', 'كيكه', 'حلا', 'مشروبات'] },
    { id: 'bills', name: 'الفواتير', kind: 'expense', words: ['فاتوره', 'فواتير', 'كهربا', 'كهرباء', 'الكهربا', 'ماء', 'مويه', 'جوال', 'نت', 'انترنت', 'stc', 'موبايلي', 'زين', 'اشتراك', 'اشتراكات', 'شحن', 'باقه'] },
    { id: 'loans', name: 'القروض والأقساط', kind: 'deduction', words: ['قرض', 'القرض', 'قسط', 'اقساط', 'تمويل', 'عقاري', 'شخصي', 'تابي', 'تمارا'] },
    { id: 'housing', name: 'السكن', kind: 'expense', words: ['ايجار', 'الايجار', 'شقه', 'سكن', 'صيانه البيت', 'سباك', 'كهربائي'] },
    { id: 'health', name: 'الصحة', kind: 'expense', words: ['صيدليه', 'دوا', 'دواء', 'علاج', 'مستشفي', 'مستشفى', 'عياده', 'مستوصف', 'دكتور', 'تحاليل', 'نظارات', 'نظاره'] },
    { id: 'shopping', name: 'التسوق والملابس', kind: 'expense', words: ['ملابس', 'لبس', 'ثوب', 'ثياب', 'شماغ', 'شنطه', 'جزمه', 'حذا', 'تسوق', 'امازون', 'نون', 'شي ان', 'مول', 'عطر', 'عطور'] },
    { id: 'car', name: 'السيارة', kind: 'expense', words: ['سياره', 'السياره', 'زيت', 'كفرات', 'ورشه', 'تامين', 'استماره', 'مخالفه'] },
    { id: 'fun', name: 'الترفيه والسفر', kind: 'expense', words: ['سينما', 'العاب', 'لعبه', 'رحله', 'سفر', 'فندق', 'طيران', 'تذكره', 'تذاكر', 'نزهه', 'استراحه'] },
    { id: 'family', name: 'العائلة والهدايا', kind: 'expense', words: ['هديه', 'هدايا', 'الاهل', 'اهلي', 'العيال', 'مدرسه', 'مصروف', 'عيديه', 'صدقه', 'زكاه', 'تبرع'] },
    { id: 'salary', name: 'الراتب', kind: 'income', words: ['راتب', 'الراتب', 'معاش'] },
    { id: 'extra', name: 'دخل إضافي', kind: 'income', words: ['مكافاه', 'بدل', 'ارباح', 'عموله', 'حواله', 'سلفه', 'رجعلي', 'ارجعلي', 'بيع', 'بعت'] },
    { id: 'other', name: 'أخرى', kind: 'expense', words: [] }
  ];

  const INCOME_VERBS = ['استلمت', 'استلم', 'نزل', 'نزلي', 'جاني', 'جاتني', 'وصلني', 'وصلتني', 'دخلي', 'دخل', 'قبضت', 'حولولي', 'انضاف', 'كسبت', 'رجعلي', 'ارجعلي', 'بعت'];
  const DEDUCT_VERBS = ['خصم', 'خصمو', 'خصموا', 'خصمت', 'انخصم', 'اقتطع', 'استقطع', 'سحب'];
  const EXPENSE_VERBS = ['صرفت', 'اشتريت', 'دفعت', 'شريت', 'سددت', 'حطيت', 'عبيت', 'طلبت', 'تعشيت', 'تغديت', 'حولت', 'اعطيت'];

  function hasWord(tokens, list) {
    return tokens.some(t => {
      const c = [t.n, ...stripPrefix(t.n)];
      return c.some(x => list.includes(x));
    });
  }
  function withAl(x) { const c = [x, ...stripPrefix(x)]; return c.concat(c.filter(y => /^ال../.test(y)).map(y => y.slice(2))); }
  function matchCategory(tokens, cats) {
    let best = null;
    for (const c of cats) {
      const words = (c.words || []).concat([norm(c.name)]);
      for (const t of tokens) {
        const cand = withAl(t.n);
        if (cand.some(x => words.includes(x))) { if (!best) best = c; break; }
      }
      if (best) break;
    }
    return best;
  }

  // ---------- تقسيم الجملة لعمليات ----------
  const CLAUSE_STARTERS = INCOME_VERBS.concat(DEDUCT_VERBS, EXPENSE_VERBS, ['القرض', 'قرض', 'قسط', 'فاتوره', 'الراتب', 'راتب', 'وكمان', 'كمان', 'بعدين', 'ثم', 'عندي', 'ذكرني', 'موعد', 'لازم', 'مهمه', 'اجتماع']);
  function splitClauses(tokens) {
    const clauses = [];
    let cur = [];
    const push = () => { if (cur.length) clauses.push(cur); cur = []; };
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.punct) { push(); continue; }
      if (cur.length && /^و/.test(t.n)) {
        const rest = t.n.slice(1);
        if (CLAUSE_STARTERS.includes(rest) || ['كمان', 'بعدين', 'ثم'].includes(rest)) { push(); }
      } else if (cur.length && ['كمان', 'بعدين', 'ثم', 'وكمان'].includes(t.n)) { push(); continue; }
      cur.push(t);
    }
    push();
    return clauses;
  }

  // يدمج المقطع اللي ما فيه مبلغ مع اللي قبله أو بعده
  function mergeAmountless(clauses, hasAmt) {
    const out = [];
    for (const c of clauses) {
      if (!hasAmt(c) && out.length) { out[out.length - 1] = out[out.length - 1].concat(c); }
      else out.push(c);
    }
    // لو أول مقطع بدون مبلغ ودُمج غلط
    if (out.length > 1 && !hasAmt(out[0])) { out[1] = out[0].concat(out[1]); out.shift(); }
    return out;
  }

  // ========== تحليل المالية ==========
  function parseFinance(text, opts) {
    opts = opts || {};
    const cats = opts.categories || DEFAULT_CATEGORIES;
    const tokens = tokenize(text);
    let clauses = splitClauses(tokens);
    clauses = mergeAmountless(clauses, c => findAmounts(c).length > 0);
    const results = [];
    let lastCurrency = null;
    const now = opts.now ? new Date(opts.now) : new Date();
    const dateOffset = hasWord(tokens, ['امس', 'البارحه']) ? -1 : 0;

    for (const cl of clauses) {
      const amts = findAmounts(cl);
      if (!amts.length) continue;
      const amt = amts[0];
      const cur = findCurrency(cl);
      const currency = cur ? cur.code : (lastCurrency || opts.defaultCurrency || 'SAR');
      if (cur) lastCurrency = cur.code;

      let kind = 'expense';
      if (hasWord(cl, DEDUCT_VERBS)) kind = 'deduction';
      else if (hasWord(cl, INCOME_VERBS)) kind = 'income';

      // نختار البند المناسب للنوع
      const kindCats = cats.filter(c => kind === 'income' ? c.kind === 'income' : c.kind !== 'income');
      let cat = matchCategory(cl, kindCats);
      if (kind === 'expense' && cat && cat.kind === 'deduction') kind = 'deduction';
      if (kind === 'income' && !cat) cat = cats.find(c => c.id === 'extra') || kindCats[0];
      if (kind === 'deduction' && !cat) cat = cats.find(c => c.id === 'loans') || kindCats[0];
      if (!cat) cat = cats.find(c => c.id === 'other') || kindCats[kindCats.length - 1];

      // العنوان
      const ns = cl.map(t => t.n);
      let title = cat.name;
      if (cat.id === 'loans') {
        if (ns.some(x => /عقاري/.test(x))) title = 'القرض العقاري';
        else if (ns.some(x => /شخصي/.test(x))) title = 'القرض الشخصي';
        else if (ns.some(x => /قسط|اقساط/.test(x))) title = 'قسط';
        else if (ns.some(x => /تمويل/.test(x))) title = 'التمويل';
        else title = 'القرض';
        const car = ns.some(x => /سياره/.test(x)); if (car) title = 'قسط السيارة';
      } else if (cat.id === 'salary') title = 'الراتب';
      else {
        // نستخدم الكلمة اللي قالها لو كانت أوضح (بنزين، صيدلية...)
        const VERBISH = ['عبيت', 'تعشيت', 'تغديت', 'شحن'];
        const wi = cl.findIndex(t => !withAl(t.n).some(x => VERBISH.includes(x)) && withAl(t.n).some(x => (cat.words || []).includes(x)));
        if (wi >= 0 && cat.id !== 'groceries' && cat.id !== 'other') {
          const w = cl[wi];
          title = (cat.words || []).includes(w.n) ? w.raw : w.raw.replace(/^(و|ب|ل|ف)(?=..)/, '');
          const nx = cl[wi + 1];
          if (/^(فاتوره|فواتير|اشتراك|قسط)$/.test(w.n) && nx && !nx.punct && !numInfo(nx.n) && !findCurrency([nx])) title += ' ' + nx.raw;
        }
      }

      // ملاحظة: الكلمات المتبقية
      const used = new Set();
      for (let k = amt.start; k < amt.end; k++) used.add(k);
      if (cur) used.add(cur.idx);
      const fillers = new Set(['استلمت', 'و', 'في', 'من', 'على', 'بـ', 'ب', 'اليوم', 'امس', 'البارحه', 'البنك', 'وخصم', 'خصم', 'خصموا', 'خصمو', 'صرفت', 'اشتريت', 'دفعت', 'شريت', 'سعودي', 'تركي', 'تركيه', 'امريكي', 'بسعر', 'سعر', 'بقيمه', 'قيمه', 'بمبلغ', 'مبلغ']);
      const titleN = norm(title).split(/\s+/);
      const note = cl.filter((t, k) => {
        if (used.has(k) || fillers.has(t.n) || t.punct) return false;
        const c = withAl(t.n);
        if (c.some(x => titleN.includes(x) || titleN.includes('ال' + x) || INCOME_VERBS.includes(x) || DEDUCT_VERBS.includes(x) || EXPENSE_VERBS.includes(x) || fillers.has(x) || (cat.words || []).includes(x))) return false;
        return true;
      }).map(t => t.raw.replace(/^و(?=..)/, '')).join(' ');

      const d = new Date(now); d.setDate(d.getDate() + dateOffset);
      results.push({
        kind, amount: Math.round(amt.value * 100) / 100, currency,
        categoryId: cat.id, title, note: note.length > 60 ? '' : note,
        date: d.getTime(), source: cl.map(t => t.raw).join(' ')
      });
    }
    return results;
  }

  // ========== تحليل المواعيد والمهام ==========
  const DAYS = [
    ['الاحد', 'احد', 'الأحد'], ['الاثنين', 'الاتنين', 'اثنين', 'الإثنين', 'الثنين'], ['الثلاثاء', 'الثلاثا', 'الثلوث', 'ثلاثاء'],
    ['الاربعاء', 'الاربعا', 'الربوع', 'اربعاء'], ['الخميس', 'خميس'], ['الجمعه', 'جمعه'], ['السبت', 'سبت']
  ].map(a => a.map(norm));
  const MONTHS = [
    ['يناير', 'جانفي'], ['فبراير'], ['مارس'], ['ابريل', 'إبريل'], ['مايو'], ['يونيو', 'يونيه'], ['يوليو', 'يوليه'],
    ['اغسطس', 'أغسطس'], ['سبتمبر'], ['اكتوبر', 'أكتوبر'], ['نوفمبر'], ['ديسمبر']
  ].map(a => a.map(norm));
  const PRAYER = { 'الفجر': [5, 0], 'الظهر': [12, 30], 'العصر': [15, 30], 'المغرب': [17, 45], 'العشا': [19, 15], 'العشاء': [19, 15], 'المغربيه': [17, 45] };
  const AM_WORDS = ['الصبح', 'الصباح', 'صباحا', 'صباح', 'ص', 'الفجر', 'فجرا', 'الضحى', 'الضحي', 'am'];
  const PM_WORDS = ['الظهر', 'ظهرا', 'العصر', 'عصرا', 'المغرب', 'المغربيه', 'مساء', 'مساءا', 'المسا', 'المساء', 'بالليل', 'الليل', 'ليلا', 'م', 'العشا', 'العشاء', 'الليله', 'pm'];

  const EVENT_WORDS = ['مناسبه', 'عزيمه', 'زواج', 'زواجه', 'عرس', 'حفله', 'حفل', 'ملكه', 'عيد', 'ميلاد', 'ملتقي', 'ملتقى', 'مؤتمر', 'فعاليه', 'ايفنت', 'معرض', 'سهره', 'طلعه', 'زياره', 'رحله', 'عشاء', 'عشا', 'غدا', 'غداء'];
  const APPT_WORDS = ['موعد', 'موعدي', 'مواعيد', 'دكتور', 'الدكتور', 'دكتوره', 'مستشفي', 'المستشفي', 'عياده', 'العياده', 'مستوصف', 'اجتماع', 'مقابله', 'صيانه', 'جوله', 'كشف', 'مراجعه', 'تحاليل'];
  const TASK_WORDS = ['ذكرني', 'ذكريني', 'لازم', 'مهمه', 'اسوي', 'اسدد', 'ادفع', 'اتصل', 'ارسل', 'اخلص', 'اشتري', 'اجيب', 'اروح', 'احجز', 'اجدد', 'اطلب', 'اكلم', 'ارد', 'اراجع', 'ابعث', 'انزل', 'اغير', 'اكتب', 'اجهز'];
  const URGENT_WORDS = ['عاجل', 'عاجله', 'مستعجل', 'مستعجله', 'ضروري', 'ضروريه', 'طارئ', 'حالا', 'فورا', 'جدا'];
  const IMPORTANT_WORDS = ['مهم'];
  const NORMAL_WORDS = ['عادي'];

  function nextWeekday(base, wd, allowToday) {
    const d = new Date(base); d.setHours(0, 0, 0, 0);
    let diff = (wd - d.getDay() + 7) % 7;
    if (diff === 0 && !allowToday) diff = 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function parseTaskClause(cl, now, ctx) {
    const used = new Set();
    const N = cl.map(t => t.n);
    const has = (list) => N.findIndex(x => list.includes(x) || stripPrefix(x).some(s => list.includes(s)));

    // --- النوع
    let type = null;
    let iE = has(EVENT_WORDS), iA = has(APPT_WORDS), iT = has(TASK_WORDS);
    if (iA >= 0) type = 'appointment';
    else if (iE >= 0) type = 'event';
    else if (iT >= 0) type = 'task';
    if (N.includes('موعد') || N.includes('موعدي')) { used.add(N.indexOf(N.includes('موعد') ? 'موعد' : 'موعدي')); }
    const typeWordIdx = N.findIndex(x => ['مهمه', 'ايفنت', 'مناسبه'].includes(x));
    if (typeWordIdx >= 0 && N[typeWordIdx] === 'مهمه') { type = 'task'; used.add(typeWordIdx); }

    // --- الأهمية
    let level = null;
    N.forEach((x, k) => {
      const c = [x, ...stripPrefix(x)];
      if (c.some(s => URGENT_WORDS.includes(s))) { if (s_notJdaOnly(x)) { level = 'urgent'; used.add(k); } }
      else if (c.some(s => IMPORTANT_WORDS.includes(s))) { if (!level) level = 'important'; used.add(k); if (k > 0 && ['مو', 'مب', 'ماهو', 'مهوب'].includes(N[k - 1])) { level = 'normal'; used.add(k - 1); } }
      else if (c.some(s => NORMAL_WORDS.includes(s))) { if (!level) level = 'normal'; used.add(k); }
    });
    function s_notJdaOnly(x) { return x !== 'جدا'; }
    if (N.includes('جدا')) { const k = N.indexOf('جدا'); used.add(k); if (level === 'important') level = 'urgent'; }
    // "مهمه" الثانية = صفة (مهمة مهمة)
    const mIdx = N.map((x, k) => x === 'مهمه' ? k : -1).filter(k => k >= 0);
    if (mIdx.length > 1) { level = level || 'important'; mIdx.forEach(k => used.add(k)); }

    // --- التاريخ
    let date = null, dateSet = false, deadline = false;
    const base = new Date(now);
    for (let k = 0; k < N.length; k++) {
      const x = N[k], xs = [x, ...stripPrefix(x)];
      if (xs.includes('اليوم') || xs.includes('الحين')) { date = new Date(base); dateSet = true; used.add(k); }
      else if (xs.includes('الليله')) { date = new Date(base); dateSet = true; used.add(k); ctx.pmHint = true; }
      else if (xs.some(s => ['بكره', 'بكرا', 'غدا', 'غدوه', 'باكر'].includes(s))) {
        if (k > 0 && N[k - 1] === 'بعد') { date = new Date(base); date.setDate(date.getDate() + 2); used.add(k - 1); }
        else { date = new Date(base); date.setDate(date.getDate() + 1); }
        dateSet = true; used.add(k);
      }
      else if (x === 'بعد' && k + 1 < N.length) {
        // بعد يومين / بعد 3 ايام / بعد ساعه / بعد نص ساعه / بعد 10 دقايق / بعد اسبوع
        const nx = N[k + 1], nx2 = N[k + 2];
        const unitOf = (w) => /^(يوم|يومين|ايام)$/.test(w) ? 'd' : /^(ساعه|ساعتين|ساعات)$/.test(w) ? 'h' : /^(دقيقه|دقايق|دقائق|دقيقتين|دقيقة)$/.test(w) ? 'm' : /^(اسبوع|اسبوعين|اسابيع)$/.test(w) ? 'w' : /^(شهر|شهرين)$/.test(w) ? 'M' : null;
        let n = null, unit = unitOf(nx), span = 1;
        if (unit) n = /ين$/.test(nx) ? 2 : 1;
        else {
          const am = findAmounts(cl.slice(k + 1, k + 3));
          if (am.length && am[0].start === 0) { n = am[0].value; unit = unitOf(N[k + 1 + am[0].end]); span = am[0].end + 1; }
        }
        if (nx === 'نص' && unitOf(nx2) === 'h') { n = 0.5; unit = 'h'; span = 2; }
        if (unit && n != null) {
          const d = new Date(base);
          if (unit === 'd') d.setDate(d.getDate() + n);
          if (unit === 'w') d.setDate(d.getDate() + 7 * n);
          if (unit === 'M') d.setMonth(d.getMonth() + n);
          if (unit === 'h') { d.setTime(d.getTime() + n * 3600e3); ctx.exactTime = true; }
          if (unit === 'm') { d.setTime(d.getTime() + n * 60e3); ctx.exactTime = true; }
          date = d; dateSet = true;
          for (let q = k; q <= k + span; q++) used.add(q);
          k += span;
        }
      }
      else {
        const wd = DAYS.findIndex(a => a.some(dn => xs.includes(dn)));
        if (wd >= 0) {
          date = nextWeekday(base, wd, false); dateSet = true; used.add(k);
          if (k > 0 && ['قبل', 'قبل يوم'].includes(N[k - 1])) { deadline = true; used.add(k - 1); }
          if (k > 0 && ['يوم'].includes(N[k - 1])) used.add(k - 1);
          if (N[k + 1] === 'الجاي' || N[k + 1] === 'القادم') { used.add(k + 1); }
          continue;
        }
        const mo = MONTHS.findIndex(a => a.some(mn => xs.includes(mn)));
        if (mo >= 0) {
          // "25 اكتوبر" أو "خمسه وعشرين اكتوبر"
          const am = findAmounts(cl.slice(Math.max(0, k - 3), k));
          let day = 1;
          if (am.length) { const a = am[am.length - 1]; day = a.value; for (let q = Math.max(0, k - 3) + a.start; q < Math.max(0, k - 3) + a.end; q++) used.add(q); }
          const d = new Date(base); d.setHours(0, 0, 0, 0); d.setMonth(mo, Math.min(31, Math.max(1, day)));
          if (d.getTime() < new Date(base).setHours(0, 0, 0, 0)) d.setFullYear(d.getFullYear() + 1);
          date = d; dateSet = true; used.add(k);
          if (k > 0 && N[k - 1] === 'شهر') used.add(k - 1);
          continue;
        }
        if (/^\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?$/.test(x)) {
          const p = x.split(/[\/-]/).map(Number);
          const d = new Date(base); d.setHours(0, 0, 0, 0);
          d.setMonth(p[1] - 1, p[0]); if (p[2]) d.setFullYear(p[2] < 100 ? 2000 + p[2] : p[2]);
          else if (d.getTime() < new Date(base).setHours(0, 0, 0, 0)) d.setFullYear(d.getFullYear() + 1);
          date = d; dateSet = true; used.add(k); continue;
        }
        if (x === 'نهايه' && N[k + 1] === 'الشهر') {
          const d = new Date(base); d.setMonth(d.getMonth() + 1, 0); date = d; dateSet = true; used.add(k); used.add(k + 1);
        }
        if (x === 'الاسبوع' && (N[k + 1] === 'الجاي' || N[k + 1] === 'القادم')) {
          const d = new Date(base); d.setDate(d.getDate() + 7); date = d; dateSet = true; used.add(k); used.add(k + 1);
        }
        if (x === 'قبل' && k + 1 < N.length && !['بساعه', 'بساعتين', 'بنص', 'بيوم', 'بربع'].includes(N[k + 1])) {
          // "قبل الخميس" تتعالج فوق؛ هنا نخليها
        }
      }
    }

    // --- الوقت
    let hh = null, mm = 0, timeSet = false;
    for (let k = 0; k < N.length; k++) {
      const x = N[k], xs = [x, ...stripPrefix(x)];
      if (xs.includes('الساعه') || xs.includes('ساعه')) {
        if (k > 0 && N[k - 1] === 'نص') continue;
        if (k > 0 && N[k - 1] === 'بعد') continue;
        const tail = cl.slice(k + 1, k + 4);
        // 10:30
        if (tail[0] && /^\d{1,2}:\d{2}$/.test(tail[0].n)) {
          const p = tail[0].n.split(':'); hh = +p[0]; mm = +p[1]; timeSet = true; used.add(k); used.add(k + 1);
          k++; continue;
        }
        const am = findAmounts(tail.slice(0, 2));
        if (am.length && am[0].start === 0) {
          let v = am[0].value;
          // "عشره ونص"، "عشره وربع"، "عشره الا ربع"
          const after = N.slice(k + 1 + am[0].end, k + 1 + am[0].end + 2);
          const end = k + 1 + am[0].end;
          for (let q = k; q < end; q++) used.add(q);
          hh = Math.floor(v); mm = 0; timeSet = true;
          if (v !== Math.floor(v)) mm = Math.round((v - Math.floor(v)) * 60);
          if (after[0] === 'ونص') { mm = 30; used.add(end); }
          else if (after[0] === 'وربع') { mm = 15; used.add(end); }
          else if (after[0] === 'وثلث') { mm = 20; used.add(end); }
          else if (after[0] === 'الا' && after[1] === 'ربع') { hh -= 1; mm = 45; used.add(end); used.add(end + 1); }
          else if (after[0] === 'الا' && after[1] === 'ثلث') { hh -= 1; mm = 40; used.add(end); used.add(end + 1); }
          else if (after[0] && /^و/.test(after[0])) {
            const mAm = findAmounts(cl.slice(end, end + 3));
            if (mAm.length && mAm[0].start === 0 && mAm[0].value < 60) {
              mm = mAm[0].value; for (let q = end; q < end + mAm[0].end; q++) used.add(q);
              if (N[end + mAm[0].end] === 'دقيقه' || N[end + mAm[0].end] === 'دقايق') used.add(end + mAm[0].end);
            }
          }
          continue;
        }
      }
      if (/^\d{1,2}:\d{2}$/.test(x)) { const p = x.split(':'); hh = +p[0]; mm = +p[1]; timeSet = true; used.add(k); continue; }
      // بعد العصر / قبل المغرب / المغرب
      const pr = Object.keys(PRAYER).find(p => xs.includes(norm(p)));
      if (pr && !timeSet) {
        const prev = N[k - 1];
        const [ph, pm] = PRAYER[pr];
        if (prev === 'بعد') { hh = ph; mm = pm + 20; used.add(k - 1); }
        else if (prev === 'قبل') { hh = ph; mm = pm - 30; used.add(k - 1); }
        else { hh = ph; mm = pm; }
        if (mm >= 60) { hh += 1; mm -= 60; } if (mm < 0) { hh -= 1; mm += 60; }
        timeSet = true; used.add(k); ctx.approxPrayer = pr;
        continue;
      }
    }
    // الفترة: صباحاً / مساءً
    let period = null;
    N.forEach((x, k) => {
      const xs = [x, ...stripPrefix(x)];
      if (xs.some(s => AM_WORDS.includes(s))) { period = 'am'; used.add(k); }
      else if (xs.some(s => PM_WORDS.includes(s))) { period = period || 'pm'; if (!(ctx.approxPrayer && xs.includes(norm(ctx.approxPrayer)))) used.add(k); }
    });
    if (ctx.pmHint && !period) period = 'pm';
    if (timeSet && hh != null && !ctx.approxPrayer) {
      if (period === 'pm' && hh < 12) hh += 12;
      else if (period === 'am' && hh === 12) hh = 0;
      else if (!period && hh >= 1 && hh <= 6) hh += 12;  // "الساعة 4" غالباً العصر
    }

    // --- "قبلها بساعة" / "ذكرني قبل بنص ساعة"
    let before = null;
    for (let k = 0; k < N.length; k++) {
      if (/^قبل(ها|ه|يها)?$/.test(N[k])) {
        const nx = N[k + 1] || '', nx2 = N[k + 2] || '';
        let v = null, span = 1;
        if (nx === 'بساعه') v = 60; else if (nx === 'بساعتين') v = 120;
        else if (nx === 'بنص' && /ساعه/.test(nx2)) { v = 30; span = 2; }
        else if (nx === 'بربع' && /ساعه/.test(nx2)) { v = 15; span = 2; }
        else if (nx === 'بيوم') v = 1440; else if (nx === 'بيومين') v = 2880;
        else {
          const am = findAmounts(cl.slice(k + 1, k + 3));
          if (am.length && am[0].start === 0) {
            const u = N[k + 1 + am[0].end] || '';
            if (/دقيق|دقايق|دقائق/.test(u)) { v = am[0].value; span = am[0].end + 1; }
            else if (/ساع/.test(u)) { v = am[0].value * 60; span = am[0].end + 1; }
          }
        }
        if (v != null) { before = v; for (let q = k; q <= k + span; q++) used.add(q); }
      }
    }

    // --- التكرار
    let repeat = 'none';
    N.forEach((x, k) => {
      if (['يوميا', 'يومي'].includes(x) || (x === 'كل' && N[k + 1] === 'يوم')) { repeat = 'daily'; used.add(k); if (x === 'كل') used.add(k + 1); }
      else if (['اسبوعيا', 'اسبوعي'].includes(x) || (x === 'كل' && (N[k + 1] === 'اسبوع' || DAYS.some(a => a.includes(N[k + 1]))))) { repeat = 'weekly'; used.add(k); if (x === 'كل' && N[k + 1] === 'اسبوع') used.add(k + 1); }
      else if (['شهريا', 'شهري'].includes(x) || (x === 'كل' && N[k + 1] === 'شهر')) { repeat = 'monthly'; used.add(k); if (x === 'كل') used.add(k + 1); }
    });

    // --- تركيب الموعد
    if (!date) date = new Date(base);
    const due = new Date(date);
    if (ctx.exactTime && !timeSet) { /* بعد ساعة: الوقت محسوب */ }
    else if (timeSet) due.setHours(Math.max(0, Math.min(23, hh)), Math.max(0, Math.min(59, mm)), 0, 0);
    else due.setHours(type === 'task' && deadline ? 9 : 9, 0, 0, 0);
    // لو الوقت عدى اليوم وما ذكر يوم → بكرة
    if (!dateSet && due.getTime() < base.getTime() - 60e3) due.setDate(due.getDate() + 1);

    // --- العنوان
    const FILL = new Set(['ذكرني', 'ذكريني', 'عندي', 'عندنا', 'لازم', 'ان', 'اني', 'إني', 'انه', 'في', 'الساعه', 'ساعه', 'يوم', 'تاريخ', 'علي', 'على', 'و', 'يا', 'سكرتيري', 'سجل', 'سجلي', 'حط', 'حطلي', 'ضيف', 'اضف', 'أضف', 'لي', 'الحين', 'قبل', 'بعد', 'موعد']);
    let words = cl.filter((t, k) => !used.has(k)).map(t => t);
    const isFill = (t) => FILL.has(t.n) || (/^و./.test(t.n) && FILL.has(t.n.slice(1)));
    while (words.length && isFill(words[0])) words.shift();
    while (words.length && isFill(words[words.length - 1])) words.pop();
    let title = words.map(t => t.raw).join(' ').replace(/^(في|ب)\s+/, '').trim();
    if (!title) title = type === 'appointment' ? 'موعد' : type === 'event' ? 'مناسبة' : 'مهمة';

    // ربط بالمالية
    const moneyCat = matchCategory(cl, DEFAULT_CATEGORIES.filter(c => ['bills', 'loans', 'housing'].includes(c.id)));
    const money = /سدد|ادفع|دفع|سداد|قسط|فاتور|ايجار|اشحن|تجديد|اجدد/.test(N.join(' ')) ? (moneyCat ? moneyCat.id : 'bills') : null;

    type = type || (timeSet ? 'appointment' : 'task');
    if (!level) level = type === 'task' ? 'normal' : 'important';

    return {
      type, title, level, due: due.getTime(), timeSet: timeSet || !!ctx.exactTime, dateSet,
      deadline, repeat, before: before != null ? before : (type === 'task' ? 0 : (level === 'normal' ? 0 : 30)),
      money, approxPrayer: ctx.approxPrayer || null, source: cl.map(t => t.raw).join(' ')
    };
  }

  function parseTasks(text, opts) {
    opts = opts || {};
    const now = opts.now ? new Date(opts.now) : new Date();
    const tokens = tokenize(text);
    // نقسم على "وذكرني"، "وعندي"، "وموعد"، "و لازم" والفواصل
    const parts = [];
    let cur = [];
    const STARTS = ['ذكرني', 'ذكريني', 'عندي', 'موعد', 'لازم', 'مهمه', 'اجتماع', 'كمان', 'بعدين'];
    for (const t of tokens) {
      if (t.punct) { if (cur.length) parts.push(cur); cur = []; continue; }
      const rest = /^و/.test(t.n) ? t.n.slice(1) : null;
      if (cur.length && ((rest && STARTS.includes(rest)) || (['بعدين', 'وبعدين', 'ثم', 'وكمان'].includes(t.n)))) {
        parts.push(cur); cur = [];
        if (['بعدين', 'وبعدين', 'ثم', 'وكمان'].includes(t.n)) continue;
        cur.push({ raw: t.raw.replace(/^و/, ''), n: rest, punct: false });
        continue;
      }
      cur.push(t);
    }
    if (cur.length) parts.push(cur);
    // نشيل "و" من أول كلمة في المقطع لو كانت كلمة معروفة (ومهمة، وذكرني، وعندي...)
    const KNOWN = STARTS.concat(TASK_WORDS, APPT_WORDS, EVENT_WORDS, ['مهمه', 'بكره', 'اليوم', 'الساعه', 'بعد']);
    parts.forEach(p => { const f = p[0]; if (f && /^و../.test(f.n) && KNOWN.includes(f.n.slice(1))) p[0] = { raw: f.raw.replace(/^و/, ''), n: f.n.slice(1), punct: false }; });
    // ندمج المقاطع القصيرة جداً (كلمة وحدة بدون معنى) مع اللي قبلها
    const merged = [];
    for (const p of parts) {
      if (merged.length && p.length <= 2 && !p.some(t => STARTS.includes(t.n))) merged[merged.length - 1] = merged[merged.length - 1].concat(p);
      else merged.push(p);
    }
    const out = [];
    for (const p of merged) {
      const r = parseTaskClause(p, now, {});
      const onlyBefore = out.length && ['مهمة', 'موعد', 'مناسبة'].includes(r.title) && p.some(t => /^قبل/.test(t.n));
      if (onlyBefore) { const prev = out[out.length - 1]; const r2 = parseTaskClause(p, now, {}); prev.before = r2.before; continue; }
      out.push(r);
    }
    return out;
  }

  const api = { norm, tokenize, findAmounts, parseFinance, parseTasks, DEFAULT_CATEGORIES, CURRENCIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Parser = api;
})(typeof window !== 'undefined' ? window : globalThis);
