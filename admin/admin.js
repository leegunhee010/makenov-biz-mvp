/* 메이크노브 관리자 (시연용). 데이터는 ../adcenter/assets/js/mkdata.js 의 MK 를 씁니다.
   모든 목록은 list() 엔진 하나로 정렬 · 검색(여러 단어, 초성) · 필터 · 페이지 · 선택 · CSV 를 처리합니다. */
(function () {
  var D = function () { return MK.db; };
  var $view = document.getElementById('view');
  var TABS = [
    ['dash', 'ti-layout-dashboard', '대시보드'],
    ['customers', 'ti-building', '고객사'],
    ['partners', 'ti-world-pin', '파트너'],
    ['assign', 'ti-list-check', '후보 배정'],
    ['meetings', 'ti-video', '미팅 관리'],
    ['minutes', 'ti-notes', '회의록'],
    ['ledger', 'ti-coins', '토큰 장부'],
    ['site', 'ti-settings', '사이트 관리']
  ];

  /* ── 화면 상태 (검색어 · 정렬 · 필터 · 페이지 크기 기억) ── */
  var UIKEY = 'mk-admin-ui-v1', UI;
  try { UI = JSON.parse(localStorage.getItem(UIKEY)) || {}; } catch (e) { UI = {}; }
  UI.lists = UI.lists || {};
  function saveUI() { try { localStorage.setItem(UIKEY, JSON.stringify(UI)); } catch (e) {} }
  function L(key) { var s = UI.lists[key]; if (!s) s = UI.lists[key] = { q: '', sort: null, ps: 20, pg: 0, f: {}, sel: [] }; s.sel = s.sel || []; s.f = s.f || {}; return s; }
  var LAST = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg) { var t = document.getElementById('toast'); t.querySelector('span').textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2400); }
  function save(msg) { MK.save(); render(); if (msg) toast(msg); }
  function cname(id) { var c = MK.customer(id); return c ? c.name : '-'; }
  function bdg(st) { return '<span class="bdg ' + st + '">' + (MK.STATUS[st] || st) + '</span>'; }
  function card(title, icon, body, tools) { return '<div class="card"><div class="card-h"><h2><i class="ti ' + icon + '"></i>' + title + '</h2><div class="sp"></div>' + (tools || '') + '</div>' + body + '</div>'; }
  function uniq(arr) { var o = []; arr.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o.sort(function (a, b) { return String(a).localeCompare(String(b), 'ko'); }); }
  function needMinutes() { return D().meetings.filter(function (m) { return m.status === 'done' && !D().minutes.some(function (n) { return n.meeting === m.id; }); }); }
  function endDate(c) { var m = String(c.period || '').match(/~\s*(\d{4})\.(\d{2})\.(\d{2})/); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; }
  function daysTo(d) { if (!d) return 9999; return Math.round((new Date(d) - new Date(MK.today())) / 86400000); }

  /* ── 검색: 여러 단어(띄어쓰기) 모두 포함, 한글 초성도 됨 ── */
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function chosung(s) { return String(s).replace(/[가-힣]/g, function (ch) { return CHO[Math.floor((ch.charCodeAt(0) - 0xac00) / 588)]; }); }
  function terms(q) { return String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean); }
  function match(q, text) {
    var t = String(text).toLowerCase(), c = null;
    return terms(q).every(function (w) { if (/^[ㄱ-ㅎ]+$/.test(w)) { c = c || chosung(t); return c.indexOf(w) >= 0; } return t.indexOf(w) >= 0; });
  }
  function hlFor(q) {
    var ws = terms(q).filter(function (w) { return !/^[ㄱ-ㅎ]+$/.test(w); }).map(function (w) { return esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    if (!ws.length) return esc;
    var re = new RegExp('(' + ws.join('|') + ')', 'gi');
    return function (s) { return esc(s).replace(re, '<mark>$1</mark>'); };
  }

  /* ── 목록 엔진 ── */
  function list(key, cfg) {
    var st = L(key), hl = hlFor(st.q);
    var items = cfg.items.filter(function (it) {
      if (st.q && !match(st.q, cfg.text(it))) return false;
      return (cfg.filters || []).every(function (f) { var v = st.f[f.k]; return !v || f.fn(it, v); });
    });
    var cols = cfg.cols, sort = st.sort || cfg.def;
    var col = sort && cols.filter(function (c) { return c.k === sort.k; })[0];
    if (col && col.v) {
      var dir = sort.d === 'desc' ? -1 : 1;
      items.sort(function (a, b) {
        var x = col.v(a), y = col.v(b);
        if (x === '' || x == null) return 1; if (y === '' || y == null) return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko', { numeric: true })) * dir;
      });
    }
    LAST[key] = { items: items, cols: cols, cfg: cfg };
    var total = items.length, ps = st.ps || 20, pages = Math.max(1, Math.ceil(total / ps));
    st.pg = Math.min(st.pg || 0, pages - 1);
    var view = items.slice(st.pg * ps, (st.pg + 1) * ps);
    var idOf = cfg.id || function (it) { return it.id; };
    var selOn = !!cfg.bulk, sel = st.sel.filter(function (id) { return items.some(function (it) { return String(idOf(it)) === String(id); }); });
    st.sel = sel;
    var active = (st.q ? 1 : 0) + Object.keys(st.f).filter(function (k) { return st.f[k]; }).length;

    var bar = '<div class="lbar">' + (cfg.lead || '') +
      '<div class="sbox"><i class="ti ti-search"></i><input type="search" data-lq="' + key + '" value="' + esc(st.q) + '" placeholder="' + esc(cfg.ph || '검색') + '"></div>' +
      (cfg.filters || []).map(function (f) {
        return '<select class="in fsel' + (st.f[f.k] ? ' on' : '') + '" data-lf="' + key + '" data-fk="' + f.k + '"><option value="">' + f.l + ' 전체</option>' + f.o.map(function (o) { var ov = Array.isArray(o) ? o[0] : o, ol = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(ov) + '"' + (String(st.f[f.k]) === String(ov) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
      }).join('') +
      (active ? '<button class="btn sm" data-lreset="' + key + '"><i class="ti ti-filter-off"></i>초기화</button>' : '') +
      '<span class="sp"></span><span class="cnt"><b>' + total.toLocaleString() + '</b>건' + (total !== cfg.items.length ? ' / 전체 ' + cfg.items.length.toLocaleString() : '') + '</span>' +
      (cfg.csv !== false ? '<button class="btn sm" data-csv="' + key + '"><i class="ti ti-download"></i>CSV</button>' : '') + '</div>';
    if (selOn && sel.length) bar += '<div class="bulk"><b>' + sel.length + '건 선택</b>' + cfg.bulk.map(function (b) { return '<button class="btn sm' + (b[2] ? ' ' + b[2] : '') + '" data-bulk="' + key + '" data-b="' + b[0] + '">' + b[1] + '</button>'; }).join('') + '<button class="btn sm" data-selnone="' + key + '">선택 해제</button></div>';

    var head = '<tr>' + (selOn ? '<th class="ck"><input type="checkbox" data-selall="' + key + '"' + (sel.length && sel.length === total ? ' checked' : '') + '></th>' : '') +
      cols.map(function (c) {
        if (!c.v) return '<th>' + c.l + '</th>';
        var on = sort && sort.k === c.k, ic = on ? (sort.d === 'desc' ? 'ti-arrow-down' : 'ti-arrow-up') : 'ti-arrows-sort';
        return '<th class="srt' + (on ? ' on' : '') + '" data-sort="' + key + '" data-k="' + c.k + '">' + c.l + '<i class="ti ' + ic + '"></i></th>';
      }).join('') + (cfg.act ? '<th></th>' : '') + '</tr>';
    var body = view.map(function (it) {
      var id = String(idOf(it)), ck = sel.indexOf(id) >= 0;
      return '<tr' + (ck ? ' class="sel"' : '') + '>' + (selOn ? '<td class="ck"><input type="checkbox" data-sel="' + key + '" data-id="' + esc(id) + '"' + (ck ? ' checked' : '') + '></td>' : '') +
        cols.map(function (c) { return '<td' + (c.cls ? ' class="' + c.cls + '"' : '') + '>' + c.h(it, hl) + '</td>'; }).join('') + (cfg.act ? '<td class="act">' + cfg.act(it) + '</td>' : '') + '</tr>';
    }).join('');
    var tbl = total ? '<div class="tw"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' : '<div class="empty"><i class="ti ti-zoom-question"></i>' + (active ? '조건에 맞는 결과가 없습니다' : (cfg.empty || '내용이 없습니다')) + '</div>';

    var pager = '';
    if (total > 10) {
      var nums = '', a = Math.max(0, st.pg - 2), z = Math.min(pages - 1, a + 4); a = Math.max(0, z - 4);
      for (var i = a; i <= z; i++) nums += '<button class="pgn' + (i === st.pg ? ' on' : '') + '" data-pg="' + key + '" data-p="' + i + '">' + (i + 1) + '</button>';
      pager = '<div class="pager"><select class="in" data-lps="' + key + '">' + [20, 50, 100].map(function (n) { return '<option value="' + n + '"' + (n === ps ? ' selected' : '') + '>' + n + '건씩</option>'; }).join('') + '</select><span class="sp"></span>' +
        (pages > 1 ? '<button class="pgn" data-pg="' + key + '" data-p="0"' + (st.pg ? '' : ' disabled') + '><i class="ti ti-chevrons-left"></i></button><button class="pgn" data-pg="' + key + '" data-p="' + (st.pg - 1) + '"' + (st.pg ? '' : ' disabled') + '><i class="ti ti-chevron-left"></i></button>' + nums +
          '<button class="pgn" data-pg="' + key + '" data-p="' + (st.pg + 1) + '"' + (st.pg < pages - 1 ? '' : ' disabled') + '><i class="ti ti-chevron-right"></i></button><button class="pgn" data-pg="' + key + '" data-p="' + (pages - 1) + '"' + (st.pg < pages - 1 ? '' : ' disabled') + '><i class="ti ti-chevrons-right"></i></button>' : '') +
        '<span class="sp"></span><span class="note">' + (st.pg * ps + 1) + '–' + Math.min(total, (st.pg + 1) * ps) + ' / ' + total.toLocaleString() + '</span></div>';
    }
    return card(cfg.title, cfg.icon, bar + tbl + pager, cfg.tools);
  }
  function csv(key) {
    var x = LAST[key]; if (!x) return;
    var cols = x.cols.filter(function (c) { return c.csv || c.v; });
    var rows = [cols.map(function (c) { return c.l; })].concat(x.items.map(function (it) { return cols.map(function (c) { return (c.csv || c.v)(it); }); }));
    var text = '﻿' + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = 'makenov-' + key + '-' + MK.today() + '.csv'; a.click();
    toast(x.items.length + '건을 CSV로 내려받았습니다');
  }

  /* ── 모달 폼 ── */
  var formSave = null;
  function openForm(title, fields, vals, onSave) {
    vals = vals || {};
    document.getElementById('m-title').textContent = title;
    document.getElementById('m-body').innerHTML = fields.map(function (f) {
      var v = vals[f.k] == null ? (f.def == null ? '' : f.def) : vals[f.k], inp;
      if (f.t === 'textarea') inp = '<textarea name="' + f.k + '">' + esc(Array.isArray(v) ? v.join('\n') : v) + '</textarea>';
      else if (f.t === 'select') inp = '<select name="' + f.k + '">' + f.o.map(function (o) { var ov = Array.isArray(o) ? o[0] : o, ol = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
      else if (f.t === 'file') inp = '<input type="file" name="' + f.k + '" accept="' + (f.accept || '') + '">';
      else inp = '<input type="' + (f.t || 'text') + '" name="' + f.k + '" value="' + esc(v) + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.list ? ' list="' + f.list + '"' : '') + '>';
      return '<div class="f' + (f.full ? ' full' : '') + '"><label>' + f.l + '</label>' + inp + (f.hint ? '<span class="hint">' + f.hint + '</span>' : '') + '</div>';
    }).join('');
    formSave = function (form) {
      var out = {}, files = [];
      fields.forEach(function (f) {
        var el = form.elements[f.k]; if (!el) return;
        if (f.t === 'file') { if (el.files && el.files[0]) files.push([f.k, el.files[0]]); return; }
        out[f.k] = f.t === 'number' ? Number(el.value || 0) : el.value.trim();
      });
      if (!files.length) return onSave(out);
      var left = files.length;
      files.forEach(function (pair) { var r = new FileReader(); r.onload = function () { out[pair[0]] = r.result; if (--left === 0) onSave(out); }; r.readAsText(pair[1]); });
    };
    document.getElementById('mask').classList.add('on');
    var first = document.querySelector('#m-body input,#m-body select,#m-body textarea'); if (first) first.focus();
  }
  function closeForm() { document.getElementById('mask').classList.remove('on'); formSave = null; }
  document.getElementById('m-form').addEventListener('submit', function (e) { e.preventDefault(); if (formSave) { formSave(this); closeForm(); } });
  document.getElementById('mask').addEventListener('click', function (e) { if (e.target.hasAttribute('data-close') || e.target.id === 'mask') closeForm(); });

  function custPicker(id, cur, allowAll) {
    var c = MK.customer(cur) || {};
    return '<div class="sbox"><i class="ti ti-building"></i><input type="search" list="cust-dl" id="' + id + '" value="' + esc(c.name || '') + '" placeholder="' + (allowAll ? '전체 고객사 (이름으로 찾기)' : '고객사 이름으로 찾기') + '"></div>';
  }
  function custByName(name) { return D().customers.filter(function (c) { return c.name === name; })[0]; }
  function goList(tab, key, patch) { var s = L(key); Object.assign(s, patch); s.pg = 0; saveUI(); if (location.hash === '#' + tab) render(); else location.hash = tab; }

  /* ── 1. 대시보드 ── */
  function vDash() {
    var db = D(), month = db.month;
    var req = db.meetings.filter(function (m) { return m.status === 'requested' || m.status === 'pending'; });
    var nm = needMinutes();
    var low = db.customers.filter(function (c) { return MK.balance(c.id) < 250; });
    var inq = db.inquiries.filter(function (q) { return q.status === '새 문의'; });
    var ending = db.customers.filter(function (c) { var d = daysTo(endDate(c)); return d >= 0 && d <= 60; });
    var k = function (ic, l, v, go, w) { return '<button class="kpi' + (w && v ? ' warn' : '') + '" data-go="' + go + '"><small><i class="ti ' + ic + '"></i>' + l + '</small><b>' + v.toLocaleString() + '</b><span>바로 보기 <i class="ti ti-arrow-right"></i></span></button>'; };
    var html = '<div class="kpis">' + k('ti-building', '고객사', db.customers.length, 'cust-all') + k('ti-calendar-question', '처리할 미팅', req.length, 'meet-req', 1) +
      k('ti-notes-off', '회의록 미등록', nm.length, 'min-need', 1) + k('ti-coins', '토큰 부족 고객사', low.length, 'cust-low', 1) + k('ti-message-plus', '새 상담 신청', inq.length, 'inq-new', 1) + '</div>';
    var mini = function (title, icon, rows, go) { return card(title, icon, rows.length ? '<div class="tw"><table><tbody>' + rows.join('') + '</tbody></table></div>' : '<div class="empty">처리할 일이 없습니다</div>', go ? '<button class="btn sm" data-go="' + go + '">전체 보기</button>' : ''); };
    html += '<div class="two">' + mini('처리할 미팅', 'ti-calendar-question', req.slice(0, 8).map(function (m) {
      return '<tr><td>' + esc(cname(m.cust)) + '<span class="sub">' + esc(MK.pname(m.partner)) + ' · ' + esc(m.kind || '') + '</span></td><td>' + bdg(m.status) + '</td><td class="act"><button class="btn sm" data-act="meet-edit" data-id="' + m.id + '">일정 잡기</button></td></tr>';
    }), 'meet-req') + mini('회의록 미등록', 'ti-notes-off', nm.slice(0, 8).map(function (m) {
      return '<tr><td>' + esc(cname(m.cust)) + '<span class="sub">' + esc(MK.pname(m.partner)) + ' · ' + m.date + '</span></td><td class="act"><button class="btn sm" data-act="min-new" data-meet="' + m.id + '">회의록 등록</button></td></tr>';
    }), 'min-need') + '</div><div class="two">' + mini('계약 종료 60일 이내', 'ti-calendar-time', ending.sort(function (a, b) { return endDate(a).localeCompare(endDate(b)); }).slice(0, 8).map(function (c) {
      return '<tr><td>' + esc(c.name) + '<span class="sub">' + esc(c.plan) + ' · ' + esc(c.marketer) + '</span></td><td>' + endDate(c) + '</td><td class="minus">D-' + daysTo(endDate(c)) + '</td></tr>';
    }), 'cust-end') + mini('새 상담 신청', 'ti-message-plus', inq.slice(0, 8).map(function (q) {
      return '<tr><td>' + esc(q.company) + '<span class="sub">' + esc(q.name) + ' · ' + esc(q.phone) + '</span></td><td>' + esc(q.plan || '-') + '</td><td>' + q.date + '</td></tr>';
    }), 'inq-new') + '</div>';
    return html;
  }

  /* ── 2. 고객사 ── */
  var CUST_F = [
    { k: 'name', l: '회사명' }, { k: 'email', l: '비즈센터 계정 이메일' },
    { k: 'plan', l: '플랜', t: 'select', o: ['3개월', '6개월', '1년'] }, { k: 'monthTokens', l: '월 지급 토큰', t: 'number', def: 300 },
    { k: 'period', l: '계약 기간', ph: '2026.11.01 ~ 2027.04.30' }, { k: 'marketer', l: '담당 마케터', list: 'mk-dl' },
    { k: 'product', l: '주요 제품', full: true }
  ];
  var PLAN_ORD = { '3개월': 1, '6개월': 2, '1년': 3 };
  function vCustomers() {
    var db = D(), cnt = {};
    db.assigns.forEach(function (a) { if (a.month === db.month) cnt[a.cust] = (cnt[a.cust] || 0) + 1; });
    return list('cust', {
      title: '고객사', icon: 'ti-building', items: db.customers, ph: '회사명, 이메일, 마케터, 제품 (초성 가능)',
      text: function (c) { return c.name + ' ' + c.email + ' ' + c.marketer + ' ' + c.product + ' ' + c.plan; },
      filters: [
        { k: 'plan', l: '플랜', o: ['3개월', '6개월', '1년'], fn: function (c, v) { return c.plan === v; } },
        { k: 'mk', l: '담당 마케터', o: uniq(db.customers.map(function (c) { return c.marketer; })), fn: function (c, v) { return c.marketer === v; } },
        { k: 'st', l: '상태', o: [['low', '토큰 부족 (250 미만)'], ['end', '계약 종료 60일 이내'], ['none', '이번 달 후보 미배정']], fn: function (c, v) { return v === 'low' ? MK.balance(c.id) < 250 : v === 'end' ? (function (d) { return d >= 0 && d <= 60; })(daysTo(endDate(c))) : !cnt[c.id]; } }
      ],
      def: { k: 'name', d: 'asc' },
      cols: [
        { k: 'name', l: '회사', v: function (c) { return c.name; }, h: function (c, hl) { return '<b>' + hl(c.name) + '</b><span class="sub">' + hl(c.email) + '</span>'; } },
        { k: 'plan', l: '플랜', v: function (c) { return PLAN_ORD[c.plan] || 0; }, csv: function (c) { return c.plan; }, h: function (c, hl) { return '<span class="bdg plan">' + hl(c.plan) + '</span>'; } },
        { k: 'end', l: '계약 종료', v: function (c) { return endDate(c); }, h: function (c) { var d = daysTo(endDate(c)); return endDate(c) + (d >= 0 && d <= 60 ? '<span class="sub minus">D-' + d + '</span>' : ''); } },
        { k: 'mt', l: '월 토큰', v: function (c) { return Number(c.monthTokens); }, h: function (c) { return c.monthTokens; } },
        { k: 'bal', l: '남은 토큰', v: function (c) { return MK.balance(c.id); }, h: function (c) { var b = MK.balance(c.id); return '<span class="' + (b < 250 ? 'minus' : '') + '">' + b.toLocaleString() + '</span>'; } },
        { k: 'mk', l: '담당 마케터', v: function (c) { return c.marketer; }, h: function (c, hl) { return hl(c.marketer); } },
        { k: 'cand', l: '이번 달 후보', v: function (c) { return cnt[c.id] || 0; }, h: function (c) { var n = cnt[c.id] || 0; return n ? n + '곳' : '<span class="bdg new">미배정</span>'; } }
      ],
      act: function (c) { return '<button class="btn sm" data-act="cust-view" data-id="' + c.id + '" title="이 고객사 계정으로 비즈센터 열기"><i class="ti ti-external-link"></i></button><button class="btn sm" data-act="go-assign" data-id="' + c.id + '">후보</button><button class="btn sm" data-act="go-ledger" data-id="' + c.id + '">장부</button><button class="btn sm" data-act="cust-edit" data-id="' + c.id + '">수정</button>'; },
      bulk: [['mk', '담당 마케터 변경'], ['pay', '월 지급'], ['plan', '플랜 변경']],
      tools: '<button class="btn sm" data-act="cust-bulk"><i class="ti ti-database-plus"></i>시연용 100곳 채우기</button><button class="btn pri sm" data-act="cust-new"><i class="ti ti-plus"></i>고객사 추가</button>'
    });
  }

  /* ── 3. 파트너 ── */
  var PART_F = [
    { k: 'name', l: '파트너명' }, { k: 'en', l: '영문명' },
    { k: 'region', l: '지역' }, { k: 'industry', l: '업종' },
    { k: 'items', l: '관심 품목', full: true }, { k: 'desc', l: '업종 설명', full: true },
    { k: 'wants', l: '희망 조건', full: true }, { k: 'homepage', l: '홈페이지', ph: 'www.example.vn' },
    { k: 'address', l: '주소 (구글맵 위치)', ph: 'District 1, Ho Chi Minh City' },
    { k: 'photos', l: '사진 주소 (한 줄에 하나)', t: 'textarea', full: true, hint: '사진 파일을 올린 주소를 줄마다 넣으면 비즈센터 사진 슬라이드에 나옵니다.' },
    { k: 'memo', l: '비고', t: 'textarea', full: true },
    { k: 'contactName', l: '담당자' }, { k: 'email', l: '이메일' }, { k: 'phone', l: '전화' },
    { k: 'verified', l: '사업자 인증', t: 'select', o: [['1', '인증 완료'], ['', '미인증']] }
  ];
  function partFromForm(v) { v.photos = (v.photos || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean); v.verified = !!v.verified; return v; }
  function partnerCfg(key, items, extra) {
    var db = D(), used = {};
    db.assigns.forEach(function (a) { if (a.month === db.month) used[a.partner] = (used[a.partner] || 0) + 1; });
    return Object.assign({
      items: items, ph: '파트너명, 업종, 관심 품목, 지역 (초성 가능)',
      text: function (p) { return p.name + ' ' + p.en + ' ' + p.region + ' ' + p.industry + ' ' + p.items + ' ' + (p.memo || ''); },
      filters: [
        { k: 'rg', l: '지역', o: uniq(db.partners.map(function (p) { return p.region; })), fn: function (p, v) { return p.region === v; } },
        { k: 'in', l: '업종', o: uniq(db.partners.map(function (p) { return p.industry; })), fn: function (p, v) { return p.industry === v; } },
        { k: 'dt', l: '정보', o: [['photo', '사진 있음'], ['nophoto', '사진 없음'], ['home', '홈페이지 있음'], ['memo', '비고 있음']], fn: function (p, v) { return v === 'photo' ? p.photos.length : v === 'nophoto' ? !p.photos.length : v === 'home' ? !!p.homepage : !!p.memo; } }
      ],
      def: { k: 'name', d: 'asc' },
      cols: [
        { k: 'name', l: '파트너', v: function (p) { return p.name; }, h: function (p, hl) { return '<b>' + hl(p.name) + '</b>' + (p.verified ? ' <i class="ti ti-rosette-discount-check" style="color:var(--pri-d)"></i>' : '') + '<span class="sub">' + hl(p.en) + '</span>'; } },
        { k: 'rg', l: '지역', v: function (p) { return p.region; }, h: function (p, hl) { return hl(p.region); } },
        { k: 'in', l: '업종', v: function (p) { return p.industry; }, h: function (p, hl) { return hl(p.industry); } },
        { k: 'it', l: '관심 품목', v: function (p) { return p.items; }, h: function (p, hl) { return hl(p.items); } },
        { k: 'used', l: '이번 달 배정', v: function (p) { return used[p.id] || 0; }, h: function (p) { return (used[p.id] || 0) + '곳'; } },
        { k: 'ph', l: '사진', v: function (p) { return p.photos.length; }, h: function (p) { return p.photos.length ? p.photos.length + '장' : '-'; } }
      ]
    }, extra);
  }
  function vPartners() {
    return list('part', partnerCfg('part', D().partners, {
      title: '파트너 풀', icon: 'ti-world-pin',
      act: function (p) { return '<button class="btn sm" data-act="part-edit" data-id="' + p.id + '">수정</button>'; },
      tools: '<button class="btn pri sm" data-act="part-new"><i class="ti ti-plus"></i>파트너 추가</button>'
    }));
  }

  /* ── 4. 후보 배정 ── */
  function vAssign() {
    var db = D(), cust = UI.assignCust || MK.me(), month = db.month;
    var mine = MK.assignsOf(cust, month), ids = mine.map(function (a) { return a.partner; });
    var lead = '<div class="row" style="margin-bottom:16px;gap:12px"><span class="lbl">고객사</span>' + custPicker('as-cust', cust) + '<span class="lbl">월</span><b>' + month.replace('-', '년 ') + '월</b><span class="sp"></span><span class="pill ' + (mine.length >= 10 ? 'ok' : 'warn') + '">' + mine.length + ' / 10곳 배정</span></div>';
    var left = list('asg', {
      title: '배정된 후보', icon: 'ti-list-check', items: mine, id: function (a) { return a.partner; }, ph: '배정된 후보 검색',
      text: function (a) { var p = MK.partner(a.partner) || {}; return p.name + ' ' + p.region + ' ' + p.industry + ' ' + p.items; },
      filters: [{ k: 'st', l: '상태', o: [['new', '새 후보'], ['viewed', '열람함'], ['meeting', '미팅 확정']], fn: function (a, v) { return a.status === v; } }],
      def: { k: 'date', d: 'desc' }, csv: false,
      cols: [
        { k: 'name', l: '파트너', v: function (a) { return MK.pname(a.partner); }, h: function (a, hl) { var p = MK.partner(a.partner) || {}; return '<b>' + hl(p.name) + '</b><span class="sub">' + hl(p.region + ' · ' + p.industry) + '</span>'; } },
        { k: 'date', l: '제안일', v: function (a) { return a.date; }, h: function (a) { return a.date; } },
        { k: 'st', l: '상태', v: function (a) { return a.status; }, h: function (a) { return '<select class="in" data-act="as-status" data-p="' + a.partner + '">' + ['new', 'viewed', 'meeting'].map(function (s) { return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + MK.ASSIGN[s] + '</option>'; }).join('') + '</select>'; } }
      ],
      act: function (a) { return '<button class="btn sm red" data-act="as-del" data-p="' + a.partner + '">빼기</button>'; },
      bulk: [['del', '선택 빼기', 'red']], empty: '아직 배정한 후보가 없습니다'
    });
    var right = list('pool', partnerCfg('pool', db.partners.filter(function (p) { return ids.indexOf(p.id) < 0; }), {
      title: '파트너 풀에서 고르기', icon: 'ti-world-pin', csv: false,
      act: function (p) { return '<button class="btn sm pri" data-act="as-add" data-p="' + p.id + '">배정</button>'; },
      bulk: [['add', '선택 배정', 'pri']], empty: '배정할 수 있는 파트너가 없습니다'
    }));
    return lead + '<div class="two">' + left + right + '</div>';
  }

  /* ── 5. 미팅 관리 ── */
  var ST_ORD = { requested: 1, pending: 2, confirmed: 3, done: 4, canceled: 5 };
  function meetForm() {
    return [
      { k: 'cust', l: '고객사', t: 'select', o: D().customers.map(function (c) { return [c.id, c.name]; }) },
      { k: 'partner', l: '파트너', t: 'select', o: D().partners.map(function (p) { return [String(p.id), p.name]; }) },
      { k: 'date', l: '날짜', t: 'date' }, { k: 'time', l: '시간', t: 'time' },
      { k: 'kind', l: '종류', t: 'select', o: ['첫 미팅', '후속 미팅', '사전 미팅'] },
      { k: 'status', l: '상태', t: 'select', o: [['requested', '신청됨'], ['pending', '확정 대기'], ['confirmed', '확정 (토큰 250 차감)'], ['done', '완료'], ['canceled', '취소 (차감한 토큰 환원)']] },
      { k: 'meet', l: '구글 미트 링크', full: true, ph: 'https://meet.google.com/xxx-xxxx-xxx', hint: '확정하면 고객사 비즈센터에 입장하기 버튼과 남은 시간이 나옵니다.' },
      { k: 'marketer', l: '통역 · 담당 마케터', list: 'mk-dl' }, { k: 'agenda', l: '안건' }
    ];
  }
  function applyMeet(m, v) {
    var prev = m.status;
    ['cust', 'date', 'time', 'kind', 'meet', 'marketer', 'agenda'].forEach(function (k) { if (v[k] != null) m[k] = v[k]; });
    if (v.partner) m.partner = Number(v.partner);
    if (v.status === 'confirmed' && prev !== 'confirmed') MK.confirmMeeting(m.id);
    else if (v.status === 'canceled' && prev !== 'canceled') MK.cancelMeeting(m.id);
    else if (v.status) m.status = v.status;
  }
  function vMeetings() {
    var db = D(), today = MK.today();
    var quick = [['', '전체'], ['requested', '신청됨'], ['pending', '확정 대기'], ['confirmed', '확정'], ['done', '완료'], ['canceled', '취소']];
    var st = L('meet');
    var seg = '<div class="seg">' + quick.map(function (q) { var n = q[0] ? db.meetings.filter(function (m) { return m.status === q[0]; }).length : db.meetings.length; return '<button data-quick="meet" data-v="' + q[0] + '" class="' + ((st.f.st || '') === q[0] ? 'on' : '') + '">' + q[1] + ' <em>' + n + '</em></button>'; }).join('') + '</div>';
    return list('meet', {
      title: '미팅 관리', icon: 'ti-video', items: db.meetings, lead: seg, ph: '고객사, 파트너, 마케터, 안건',
      text: function (m) { return cname(m.cust) + ' ' + MK.pname(m.partner) + ' ' + (m.marketer || '') + ' ' + (m.agenda || '') + ' ' + (m.kind || ''); },
      filters: [
        { k: 'st', l: '상태', o: quick.slice(1), fn: function (m, v) { return m.status === v; } },
        { k: 'when', l: '기간', o: [['up', '오늘 이후'], ['past', '지난 미팅'], ['month', '이번 달'], ['none', '일정 미정']], fn: function (m, v) { return v === 'none' ? !m.date : !m.date ? false : v === 'up' ? m.date >= today : v === 'past' ? m.date < today : m.date.slice(0, 7) === db.month; } },
        { k: 'mk', l: '마케터', o: uniq(db.meetings.map(function (m) { return m.marketer; })), fn: function (m, v) { return m.marketer === v; } },
        { k: 'link', l: '링크', o: [['no', '링크 없음'], ['yes', '링크 있음']], fn: function (m, v) { return v === 'no' ? !m.meet : !!m.meet; } }
      ],
      def: { k: 'when', d: 'desc' },
      cols: [
        { k: 'cust', l: '고객사', v: function (m) { return cname(m.cust); }, h: function (m, hl) { return hl(cname(m.cust)); } },
        { k: 'partner', l: '파트너', v: function (m) { return MK.pname(m.partner); }, h: function (m, hl) { return '<b>' + hl(MK.pname(m.partner)) + '</b><span class="sub">' + hl((m.kind || '') + (m.agenda ? ' · ' + m.agenda : '')) + '</span>'; } },
        { k: 'when', l: '일시', v: function (m) { return m.date ? m.date + ' ' + m.time : ''; }, h: function (m) { return m.date ? m.date + ' ' + m.time + (m.date >= today && m.status === 'confirmed' ? '<span class="sub">D-' + daysTo(m.date) + '</span>' : '') : '<span class="note">일정 미정</span>'; } },
        { k: 'st', l: '상태', v: function (m) { return ST_ORD[m.status]; }, csv: function (m) { return MK.STATUS[m.status]; }, h: function (m) { return bdg(m.status); } },
        { k: 'meet', l: '구글 미트', csv: function (m) { return m.meet; }, h: function (m) { return m.meet ? '<a class="link" href="' + esc(m.meet) + '" target="_blank" rel="noopener">링크</a>' : '<span class="note">없음</span>'; } },
        { k: 'mk', l: '통역', v: function (m) { return m.marketer || ''; }, h: function (m, hl) { return hl(m.marketer || '-'); } }
      ],
      act: function (m) {
        var a = '';
        if (m.status === 'requested' || m.status === 'pending') a += '<button class="btn sm pri" data-act="meet-confirm" data-id="' + m.id + '">확정</button>';
        if (m.status === 'confirmed') a += '<button class="btn sm" data-act="meet-done" data-id="' + m.id + '">완료</button>';
        return a + '<button class="btn sm" data-act="meet-edit" data-id="' + m.id + '">수정</button>';
      },
      bulk: [['done', '완료 처리'], ['mk', '마케터 지정'], ['cancel', '취소 (토큰 환원)', 'red']],
      tools: '<button class="btn pri sm" data-act="meet-new"><i class="ti ti-plus"></i>미팅 추가</button>'
    }) + '<p class="note">확정하면 토큰 250이 차감되고, 취소하면 차감한 토큰을 돌려줍니다. 고객이 비즈센터에서 "미팅 신청"을 누르면 "신청됨"으로 들어옵니다.</p>';
  }

  /* ── 6. 회의록 ── */
  function minForm(meetId) {
    var done = D().meetings.filter(function (m) { return m.status === 'done'; }).map(function (m) { return [m.id, cname(m.cust) + ' · ' + MK.pname(m.partner) + ' · ' + m.date]; });
    return [
      { k: 'meeting', l: '미팅', t: 'select', o: done, full: true, def: meetId },
      { k: 'title', l: '제목', full: true }, { k: 'date', l: '등록일', t: 'date', def: MK.today() },
      { k: 'url', l: '문서 주소 (선택)', ph: 'minutes/2026-10-14.html' },
      { k: 'summary', l: '요약 (비즈센터 목록에 보임)', t: 'textarea', full: true },
      { k: 'html', l: '회의록 HTML 파일 올리기', t: 'file', accept: '.html,.htm', full: true, hint: 'HTML 파일을 올리면 비즈센터에서 누를 때 그 문서가 새 창으로 열립니다.' }
    ];
  }
  function vMinutes() {
    var nm = needMinutes();
    var pend = nm.length ? list('need', {
      title: '회의록 미등록 미팅', icon: 'ti-notes-off', items: nm, ph: '고객사, 파트너', csv: false,
      text: function (m) { return cname(m.cust) + ' ' + MK.pname(m.partner); }, def: { k: 'date', d: 'desc' },
      cols: [
        { k: 'cust', l: '고객사', v: function (m) { return cname(m.cust); }, h: function (m, hl) { return hl(cname(m.cust)); } },
        { k: 'p', l: '파트너', v: function (m) { return MK.pname(m.partner); }, h: function (m, hl) { return hl(MK.pname(m.partner)); } },
        { k: 'date', l: '미팅일', v: function (m) { return m.date; }, h: function (m) { return m.date; } }
      ],
      act: function (m) { return '<button class="btn sm pri" data-act="min-new" data-meet="' + m.id + '">회의록 등록</button>'; }
    }) : '';
    return pend + list('min', {
      title: '회의록', icon: 'ti-notes', items: D().minutes, ph: '고객사, 파트너, 제목, 요약',
      text: function (n) { return cname(n.cust) + ' ' + MK.pname(n.partner) + ' ' + n.title + ' ' + n.summary; },
      filters: [{ k: 'doc', l: '문서', o: [['html', 'HTML 업로드'], ['url', '문서 주소'], ['none', '요약만']], fn: function (n, v) { return v === 'html' ? !!n.html : v === 'url' ? !n.html && !!n.url : !n.html && !n.url; } }],
      def: { k: 'date', d: 'desc' },
      cols: [
        { k: 'date', l: '등록일', v: function (n) { return n.date; }, h: function (n) { return n.date; } },
        { k: 'cust', l: '고객사', v: function (n) { return cname(n.cust); }, h: function (n, hl) { return hl(cname(n.cust)); } },
        { k: 'p', l: '파트너', v: function (n) { return MK.pname(n.partner); }, h: function (n, hl) { return hl(MK.pname(n.partner)); } },
        { k: 'title', l: '제목', v: function (n) { return n.title; }, h: function (n, hl) { return '<b>' + hl(n.title) + '</b><span class="sub">' + hl(String(n.summary).slice(0, 60)) + '</span>'; } },
        { k: 'doc', l: '문서', csv: function (n) { return n.html ? 'HTML' : n.url || ''; }, h: function (n) { return n.html ? '<span class="bdg ok">HTML 업로드</span>' : (n.url ? '<span class="bdg confirmed">문서 주소</span>' : '<span class="bdg mute">요약만</span>'); } }
      ],
      act: function (n) { return ((n.html || n.url) ? '<button class="btn sm" data-act="min-open" data-id="' + n.id + '">열기</button>' : '') + '<button class="btn sm" data-act="min-edit" data-id="' + n.id + '">수정</button><button class="btn sm red" data-act="min-del" data-id="' + n.id + '">삭제</button>'; },
      bulk: [['del', '선택 삭제', 'red']],
      tools: '<button class="btn pri sm" data-act="min-new"><i class="ti ti-upload"></i>회의록 등록</button>'
    });
  }

  /* ── 7. 토큰 장부 ── */
  var TYPES = ['지급', '충전', '차감', '환원', '이월'];
  function vLedger() {
    var db = D(), cust = UI.ledgerCust || '', c = MK.customer(cust);
    var items = db.ledger.filter(function (t) { return !cust || t.cust === cust; });
    var lead = '<div class="row" style="margin-bottom:16px;gap:12px"><span class="lbl">고객사</span>' + custPicker('led-cust', cust, true) + (cust ? '<button class="btn sm" data-act="led-all">전체 고객사 보기</button>' : '') + '</div>';
    var sum;
    if (c) sum = '<div class="card"><div class="card-b row" style="gap:28px"><div><div class="lbl">남은 토큰</div><div class="big">' + MK.balance(cust).toLocaleString() + '</div></div><div><div class="lbl">플랜</div><b>' + esc(c.plan) + ' · 월 ' + c.monthTokens + '토큰</b></div><div><div class="lbl">이번 달 사용</div><b>' + MK.used(cust, db.month) + '토큰</b></div><div class="sp"></div><button class="btn sm" data-act="led-month">월 지급하기</button><button class="btn pri sm" data-act="led-new"><i class="ti ti-plus"></i>내역 추가</button></div></div>';
    else {
      var tot = function (t) { return items.filter(function (x) { return x.type === t; }).reduce(function (s, x) { return s + Number(x.amount); }, 0); };
      sum = '<div class="kpis k4">' + ['지급', '충전', '차감', '환원'].map(function (t) { return '<div class="kpi"><small>' + t + ' 합계</small><b class="' + (t === '차감' ? 'minus' : '') + '">' + tot(t).toLocaleString() + '</b></div>'; }).join('') + '</div>';
    }
    return lead + sum + list('led', {
      title: cust ? esc(c ? c.name : '') + ' 토큰 내역' : '전체 토큰 내역', icon: 'ti-coins', items: items, ph: '고객사, 메모',
      text: function (t) { return cname(t.cust) + ' ' + t.memo + ' ' + t.type; },
      filters: [
        { k: 'tp', l: '구분', o: TYPES, fn: function (t, v) { return t.type === v; } },
        { k: 'mon', l: '월', o: uniq(db.ledger.map(function (t) { return t.date.slice(0, 7); })).reverse(), fn: function (t, v) { return t.date.slice(0, 7) === v; } }
      ],
      def: { k: 'date', d: 'desc' },
      cols: [
        { k: 'date', l: '날짜', v: function (t) { return t.date; }, h: function (t) { return t.date; } }
      ].concat(cust ? [] : [{ k: 'cust', l: '고객사', v: function (t) { return cname(t.cust); }, h: function (t, hl) { return hl(cname(t.cust)); } }]).concat([
        { k: 'tp', l: '구분', v: function (t) { return t.type; }, h: function (t) { return '<span class="bdg ' + (t.amount >= 0 ? 'ok' : 'new') + '">' + esc(t.type) + '</span>'; } },
        { k: 'amt', l: '토큰', v: function (t) { return Number(t.amount); }, h: function (t) { return '<span class="' + (t.amount >= 0 ? 'plus' : 'minus') + '">' + (t.amount > 0 ? '+' : '') + Number(t.amount).toLocaleString() + '</span>'; } },
        { k: 'memo', l: '메모', v: function (t) { return t.memo; }, h: function (t, hl) { return hl(t.memo); } }
      ]),
      act: function (t) { return '<button class="btn sm red" data-act="led-del" data-id="' + t.id + '">삭제</button>'; },
      bulk: [['del', '선택 삭제', 'red']]
    });
  }

  /* ── 8. 사이트 관리 ── */
  var FAQ_F = [{ k: 'q', l: '질문', full: true }, { k: 'a', l: '답변', t: 'textarea', full: true }, { k: 'visible', l: '공개', t: 'select', o: [['1', '공개'], ['', '숨김']] }];
  var INQ_ST = ['새 문의', '연락함', '상담 완료', '계약'];
  function vSite() {
    var t = UI.siteTab || 'inq', db = D();
    var seg = '<div class="seg" style="margin-bottom:16px">' + [['inq', '상담 신청'], ['blog', '블로그'], ['faq', '자주 묻는 질문']].map(function (s) { return '<button data-act="st" data-t="' + s[0] + '" class="' + (t === s[0] ? 'on' : '') + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (t === 'inq') return seg + list('inq', {
      title: '상담 신청', icon: 'ti-message-plus', items: db.inquiries, ph: '회사, 담당자, 연락처, 내용',
      text: function (q) { return q.company + ' ' + q.name + ' ' + q.phone + ' ' + q.email + ' ' + q.text + ' ' + (q.category || ''); },
      filters: [
        { k: 'st', l: '상태', o: INQ_ST, fn: function (q, v) { return q.status === v; } },
        { k: 'plan', l: '관심 플랜', o: uniq(db.inquiries.map(function (q) { return q.plan; })), fn: function (q, v) { return q.plan === v; } },
        { k: 'cat', l: '카테고리', o: uniq(db.inquiries.map(function (q) { return q.category; })), fn: function (q, v) { return q.category === v; } }
      ],
      def: { k: 'date', d: 'desc' },
      cols: [
        { k: 'date', l: '신청일', v: function (q) { return q.date; }, h: function (q) { return q.date; } },
        { k: 'co', l: '회사', v: function (q) { return q.company; }, h: function (q, hl) { return '<b>' + hl(q.company) + '</b><span class="sub">' + hl(q.name) + '</span>'; } },
        { k: 'ph', l: '연락처', csv: function (q) { return q.phone + ' / ' + q.email; }, h: function (q, hl) { return hl(q.phone) + '<span class="sub">' + hl(q.email) + '</span>'; } },
        { k: 'plan', l: '관심 플랜', v: function (q) { return q.plan || ''; }, h: function (q, hl) { return hl(q.plan || '-') + '<span class="sub">' + hl(q.category || '') + '</span>'; } },
        { k: 'tx', l: '내용', csv: function (q) { return q.text; }, cls: 'wide', h: function (q, hl) { return hl(q.text); } },
        { k: 'st', l: '상태', v: function (q) { return INQ_ST.indexOf(q.status); }, csv: function (q) { return q.status; }, h: function (q) { return '<select class="in" data-act="inq-st" data-id="' + q.id + '">' + INQ_ST.map(function (s) { return '<option' + (q.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>'; } }
      ],
      act: function (q) { return '<button class="btn sm red" data-act="inq-del" data-id="' + q.id + '">삭제</button>'; },
      bulk: INQ_ST.map(function (s) { return ['st:' + s, s]; }).concat([['del', '선택 삭제', 'red']])
    }) + '<p class="note">소개 사이트의 상담 신청 폼에서 보낸 내용이 여기에 들어옵니다.</p>';
    if (t === 'blog') return seg + list('blog', {
      title: '블로그', icon: 'ti-article', items: db.blog, id: function (b) { return b.slug; }, ph: '글 제목', csv: false,
      text: function (b) { return b.title; },
      filters: [{ k: 'vis', l: '공개', o: [['1', '공개'], ['0', '숨김']], fn: function (b, v) { return v === '1' ? b.visible : !b.visible; } }],
      cols: [
        { k: 'title', l: '글', v: function (b) { return b.title; }, h: function (b, hl) { return '<b>' + hl(b.title) + '</b><span class="sub">column/' + b.slug + '.html</span>'; } },
        { k: 'vis', l: '공개', v: function (b) { return b.visible ? 0 : 1; }, h: function (b) { return b.visible ? '<span class="bdg ok">공개</span>' : '<span class="bdg mute">숨김</span>'; } }
      ],
      act: function (b) { return '<a class="btn sm" href="../biz/column/' + b.slug + '.html" target="_blank" rel="noopener">보기</a><button class="btn sm" data-act="blog-tg" data-s="' + b.slug + '">' + (b.visible ? '숨기기' : '공개하기') + '</button>'; },
      bulk: [['show', '공개'], ['hide', '숨기기']]
    }) + '<p class="note">숨긴 글은 소개 사이트 블로그 목록에서 빠집니다.</p>';
    return seg + list('faq', {
      title: '자주 묻는 질문', icon: 'ti-help', items: db.faq, ph: '질문, 답변', csv: false,
      text: function (f) { return f.q + ' ' + f.a; },
      cols: [
        { k: 'q', l: '질문', h: function (f, hl) { return '<b>' + hl(f.q) + '</b>'; } },
        { k: 'a', l: '답변', cls: 'wide', h: function (f, hl) { return hl(f.a); } },
        { k: 'vis', l: '공개', h: function (f) { return f.visible ? '<span class="bdg ok">공개</span>' : '<span class="bdg mute">숨김</span>'; } }
      ],
      act: function (f) { return '<button class="btn sm" data-act="faq-up" data-id="' + f.id + '" title="위로"><i class="ti ti-arrow-up"></i></button><button class="btn sm" data-act="faq-edit" data-id="' + f.id + '">수정</button><button class="btn sm red" data-act="faq-del" data-id="' + f.id + '">삭제</button>'; },
      tools: '<button class="btn pri sm" data-act="faq-new"><i class="ti ti-plus"></i>질문 추가</button>'
    }) + '<p class="note">소개 사이트 첫 화면의 자주 묻는 질문에 이 순서대로 나옵니다.</p>';
  }

  /* ── 라우팅 ── */
  var VIEWS = { dash: vDash, customers: vCustomers, partners: vPartners, assign: vAssign, meetings: vMeetings, minutes: vMinutes, ledger: vLedger, site: vSite };
  function cur() { var h = location.hash.slice(1); return VIEWS[h] ? h : 'dash'; }
  function render() {
    var c = cur(), db = D();
    var badge = { meetings: db.meetings.filter(function (m) { return m.status === 'requested' || m.status === 'pending'; }).length, minutes: needMinutes().length, site: db.inquiries.filter(function (q) { return q.status === '새 문의'; }).length };
    document.getElementById('nav').innerHTML = TABS.map(function (t) { return '<a href="#' + t[0] + '" class="' + (t[0] === c ? 'on' : '') + '"><i class="ti ' + t[1] + '"></i>' + t[2] + (badge[t[0]] ? '<span class="bd">' + badge[t[0]] + '</span>' : '') + '</a>'; }).join('');
    document.getElementById('title').textContent = TABS.filter(function (t) { return t[0] === c; })[0][2];
    var focus = document.activeElement && document.activeElement.getAttribute('data-lq'), pos = focus ? document.activeElement.selectionStart : 0;
    var mks = uniq(db.customers.map(function (x) { return x.marketer; }).concat(db.meetings.map(function (m) { return m.marketer; })));
    $view.innerHTML = VIEWS[c]() + '<datalist id="cust-dl">' + db.customers.map(function (x) { return '<option value="' + esc(x.name) + '">'; }).join('') + '</datalist><datalist id="mk-dl">' + mks.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('') + '</datalist>';
    if (focus) { var el = $view.querySelector('[data-lq="' + focus + '"]'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }
    saveUI();
  }
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', function (e) { if (e.key === MK.KEY) { MK.reload(); render(); } });

  /* ── 통합 검색 ── */
  var gs = document.getElementById('gs'), gr = document.getElementById('gs-r');
  function gsearch(q) {
    if (!terms(q).length) { gr.classList.remove('on'); return; }
    var db = D(), hl = hlFor(q), groups = [
      ['고객사', 'ti-building', db.customers.filter(function (c) { return match(q, c.name + ' ' + c.email + ' ' + c.marketer + ' ' + c.product); }), function (c) { return [hl(c.name), esc(c.plan + ' · ' + c.marketer), 'cust', c.name]; }],
      ['파트너', 'ti-world-pin', db.partners.filter(function (p) { return match(q, p.name + ' ' + p.en + ' ' + p.region + ' ' + p.industry + ' ' + p.items); }), function (p) { return [hl(p.name), esc(p.region + ' · ' + p.industry), 'part', p.name]; }],
      ['미팅', 'ti-video', db.meetings.filter(function (m) { return match(q, cname(m.cust) + ' ' + MK.pname(m.partner) + ' ' + (m.agenda || '')); }), function (m) { return [hl(cname(m.cust) + ' · ' + MK.pname(m.partner)), esc((m.date || '일정 미정') + ' · ' + MK.STATUS[m.status]), 'meet', MK.pname(m.partner)]; }],
      ['회의록', 'ti-notes', db.minutes.filter(function (n) { return match(q, n.title + ' ' + cname(n.cust) + ' ' + MK.pname(n.partner)); }), function (n) { return [hl(n.title), esc(cname(n.cust) + ' · ' + n.date), 'min', n.title]; }],
      ['상담 신청', 'ti-message-plus', db.inquiries.filter(function (x) { return match(q, x.company + ' ' + x.name + ' ' + x.text); }), function (x) { return [hl(x.company), esc(x.name + ' · ' + x.status), 'inq', x.company]; }]
    ];
    var TAB = { cust: 'customers', part: 'partners', meet: 'meetings', min: 'minutes', inq: 'site' }, html = '', n = 0;
    groups.forEach(function (g) {
      if (!g[2].length) return; n += g[2].length;
      html += '<div class="gh"><i class="ti ' + g[1] + '"></i>' + g[0] + ' <em>' + g[2].length + '</em>' + (g[2].length > 5 ? '<button data-gall="' + g[3](g[2][0])[2] + '" data-q="' + esc(q) + '" data-tab="' + TAB[g[3](g[2][0])[2]] + '">모두 보기</button>' : '') + '</div>';
      html += g[2].slice(0, 5).map(function (it) { var r = g[3](it); return '<button class="gi" data-gall="' + r[2] + '" data-q="' + esc(r[3]) + '" data-tab="' + TAB[r[2]] + '"><b>' + r[0] + '</b><small>' + r[1] + '</small></button>'; }).join('');
    });
    gr.innerHTML = html || '<div class="ge">"' + esc(q) + '" 검색 결과가 없습니다</div>';
    gr.classList.add('on');
  }
  gs.addEventListener('input', function () { gsearch(gs.value); });
  gs.addEventListener('focus', function () { if (gs.value) gsearch(gs.value); });
  document.addEventListener('mousedown', function (e) { if (!e.target.closest('.gsw')) gr.classList.remove('on'); });
  gr.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gall]'); if (!b) return;
    var key = b.getAttribute('data-gall'), tab = b.getAttribute('data-tab');
    if (key === 'inq') UI.siteTab = 'inq';
    var s = L(key); s.q = b.getAttribute('data-q'); s.f = {}; s.pg = 0; saveUI();
    gr.classList.remove('on'); gs.blur();
    if (location.hash === '#' + tab) render(); else location.hash = tab;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); gs.focus(); gs.select(); }
    if (e.key === 'Escape') { gr.classList.remove('on'); closeForm(); }
  });

  /* ── 목록 입력 이벤트 ── */
  var qTimer;
  document.addEventListener('input', function (e) {
    var el = e.target, k = el.getAttribute('data-lq');
    if (k) { clearTimeout(qTimer); qTimer = setTimeout(function () { var s = L(k); s.q = el.value; s.pg = 0; render(); }, 120); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target, a = el.getAttribute('data-act'), k;
    if ((k = el.getAttribute('data-lf'))) { var s = L(k); s.f[el.getAttribute('data-fk')] = el.value; s.pg = 0; render(); return; }
    if ((k = el.getAttribute('data-lps'))) { var s2 = L(k); s2.ps = Number(el.value); s2.pg = 0; render(); return; }
    if ((k = el.getAttribute('data-sel'))) { var s3 = L(k), id = el.getAttribute('data-id'); s3.sel = s3.sel.filter(function (x) { return x !== id; }); if (el.checked) s3.sel.push(id); render(); return; }
    if ((k = el.getAttribute('data-selall'))) { var s4 = L(k), x = LAST[k], idOf = x.cfg.id || function (it) { return it.id; }; s4.sel = el.checked ? x.items.map(function (it) { return String(idOf(it)); }) : []; render(); return; }
    if (el.id === 'as-cust' || el.id === 'led-cust') {
      var cc = custByName(el.value);
      if (el.id === 'led-cust' && !el.value) { UI.ledgerCust = ''; L('led').pg = 0; render(); return; }
      if (!cc) return; if (el.id === 'as-cust') { UI.assignCust = cc.id; L('asg').sel = []; L('pool').sel = []; } else UI.ledgerCust = cc.id;
      L('asg').pg = L('pool').pg = L('led').pg = 0; render(); return;
    }
    if (a === 'as-status') { MK.markAssign(UI.assignCust || MK.me(), el.getAttribute('data-p'), el.value); save('상태를 바꿨습니다'); }
    else if (a === 'inq-st') { D().inquiries.forEach(function (q) { if (q.id === el.getAttribute('data-id')) q.status = el.value; }); save('상태를 바꿨습니다'); }
  });

  /* ── 일괄 처리 ── */
  function doBulk(key, b) {
    var s = L(key), ids = s.sel.slice(), db = D(), n = ids.length;
    var done = function (msg) { s.sel = []; save(msg); };
    if (key === 'cust') {
      if (b === 'pay') { ids.forEach(function (id) { var c = MK.customer(id); MK.addLedger(id, '지급', c.monthTokens, '월 지급 (일괄)'); }); return done(n + '곳에 월 지급했습니다'); }
      if (b === 'mk') return openForm(n + '곳 담당 마케터 변경', [{ k: 'marketer', l: '담당 마케터', list: 'mk-dl', full: true }], {}, function (v) { if (!v.marketer) return; ids.forEach(function (id) { MK.customer(id).marketer = v.marketer; }); done(n + '곳 담당 마케터를 바꿨습니다'); });
      if (b === 'plan') return openForm(n + '곳 플랜 변경', [{ k: 'plan', l: '플랜', t: 'select', o: [['3개월', '3개월 (월 250토큰)'], ['6개월', '6개월 (월 300토큰)'], ['1년', '1년 (월 350토큰)']], full: true }], {}, function (v) { var mt = { '3개월': 250, '6개월': 300, '1년': 350 }[v.plan]; ids.forEach(function (id) { var c = MK.customer(id); c.plan = v.plan; c.monthTokens = mt; }); done(n + '곳 플랜을 바꿨습니다'); });
    }
    if (key === 'asg' && b === 'del') { var cu = UI.assignCust || MK.me(); db.assigns = db.assigns.filter(function (a) { return !(a.cust === cu && a.month === db.month && ids.indexOf(String(a.partner)) >= 0); }); return done(n + '곳을 후보에서 뺐습니다'); }
    if (key === 'pool' && b === 'add') { var cu2 = UI.assignCust || MK.me(); ids.forEach(function (pid) { db.assigns.push({ cust: cu2, partner: Number(pid), month: db.month, date: MK.today(), status: 'new' }); }); return done(n + '곳을 후보로 배정했습니다'); }
    if (key === 'meet') {
      if (b === 'done') { ids.forEach(function (id) { var m = MK.meeting(id); if (m.status === 'confirmed') m.status = 'done'; }); return done('확정된 미팅을 완료로 바꿨습니다'); }
      if (b === 'cancel') { if (!confirm(n + '건을 취소할까요? 차감한 토큰은 돌려줍니다.')) return; ids.forEach(function (id) { MK.cancelMeeting(id); }); return done(n + '건을 취소했습니다'); }
      if (b === 'mk') return openForm(n + '건 통역 마케터 지정', [{ k: 'marketer', l: '마케터', list: 'mk-dl', full: true }], {}, function (v) { ids.forEach(function (id) { MK.meeting(id).marketer = v.marketer; }); done(n + '건에 마케터를 지정했습니다'); });
    }
    if (key === 'min' && b === 'del') { if (!confirm(n + '건을 삭제할까요?')) return; db.minutes = db.minutes.filter(function (x) { return ids.indexOf(x.id) < 0; }); return done(n + '건을 삭제했습니다'); }
    if (key === 'led' && b === 'del') { if (!confirm(n + '건을 삭제할까요?')) return; db.ledger = db.ledger.filter(function (x) { return ids.indexOf(x.id) < 0; }); return done(n + '건을 삭제했습니다'); }
    if (key === 'inq') {
      if (b === 'del') { if (!confirm(n + '건을 삭제할까요?')) return; db.inquiries = db.inquiries.filter(function (x) { return ids.indexOf(x.id) < 0; }); return done(n + '건을 삭제했습니다'); }
      var st = b.slice(3); db.inquiries.forEach(function (x) { if (ids.indexOf(x.id) >= 0) x.status = st; }); return done(n + '건을 "' + st + '"(으)로 바꿨습니다');
    }
    if (key === 'blog') { db.blog.forEach(function (x) { if (ids.indexOf(x.slug) >= 0) x.visible = b === 'show'; }); return done(n + '개 글을 ' + (b === 'show' ? '공개' : '숨김') + '으로 바꿨습니다'); }
  }

  /* ── 클릭 ── */
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-sort]'))) { var k = x.getAttribute('data-sort'), ck = x.getAttribute('data-k'), s = L(k), cfgDef = LAST[k] && LAST[k].cfg.def, curS = s.sort || cfgDef; s.sort = curS && curS.k === ck ? { k: ck, d: curS.d === 'asc' ? 'desc' : 'asc' } : { k: ck, d: 'asc' }; s.pg = 0; render(); return; }
    if ((x = t.closest('[data-pg]'))) { if (x.disabled) return; L(x.getAttribute('data-pg')).pg = Number(x.getAttribute('data-p')); render(); $view.scrollIntoView({ block: 'start' }); return; }
    if ((x = t.closest('[data-lreset]'))) { var s5 = L(x.getAttribute('data-lreset')); s5.q = ''; s5.f = {}; s5.pg = 0; render(); return; }
    if ((x = t.closest('[data-csv]'))) { csv(x.getAttribute('data-csv')); return; }
    if ((x = t.closest('[data-selnone]'))) { L(x.getAttribute('data-selnone')).sel = []; render(); return; }
    if ((x = t.closest('[data-bulk]'))) { doBulk(x.getAttribute('data-bulk'), x.getAttribute('data-b')); return; }
    if ((x = t.closest('[data-quick]'))) { var s6 = L(x.getAttribute('data-quick')); s6.f.st = x.getAttribute('data-v'); s6.pg = 0; render(); return; }
    if ((x = t.closest('[data-go]'))) {
      var g = x.getAttribute('data-go');
      if (g === 'cust-all') goList('customers', 'cust', { q: '', f: {} });
      else if (g === 'cust-low') goList('customers', 'cust', { q: '', f: { st: 'low' }, sort: { k: 'bal', d: 'asc' } });
      else if (g === 'cust-end') goList('customers', 'cust', { q: '', f: { st: 'end' }, sort: { k: 'end', d: 'asc' } });
      else if (g === 'meet-req') goList('meetings', 'meet', { q: '', f: { st: 'requested' } });
      else if (g === 'min-need') location.hash = 'minutes';
      else if (g === 'inq-new') { UI.siteTab = 'inq'; goList('site', 'inq', { q: '', f: { st: '새 문의' } }); }
      return;
    }
    var b = t.closest('[data-act]'); if (!b || b.tagName === 'SELECT') return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id'), db = D();
    if (a === 'st') { UI.siteTab = b.getAttribute('data-t'); render(); }
    else if (a === 'go-ledger') { UI.ledgerCust = id; L('led').pg = 0; location.hash = 'ledger'; }
    else if (a === 'go-assign') { UI.assignCust = id; location.hash = 'assign'; }
    else if (a === 'cust-bulk') bulk();
    else if (a === 'cust-view') { MK.setMe(id); window.open('../adcenter/index.html', '_blank'); toast(cname(id) + ' 계정으로 비즈센터를 엽니다'); }
    else if (a === 'cust-new') openForm('고객사 추가', CUST_F, {}, function (v) { v.id = MK.nextId('c'); db.customers.push(v); MK.addLedger(v.id, '지급', v.monthTokens, '첫 달 월 지급'); save('고객사를 추가했습니다'); });
    else if (a === 'cust-edit') { var c = MK.customer(id); openForm('고객사 수정', CUST_F, c, function (v) { Object.assign(c, v); save('저장했습니다'); }); }
    else if (a === 'part-new') openForm('파트너 추가', PART_F, { verified: '' }, function (v) { v = partFromForm(v); v.id = db.partners.reduce(function (m, p) { return Math.max(m, p.id); }, 0) + 1; db.partners.push(v); save('파트너를 추가했습니다'); });
    else if (a === 'part-edit') { var p = MK.partner(id), vals = Object.assign({}, p, { verified: p.verified ? '1' : '' }); openForm('파트너 수정', PART_F, vals, function (v) { Object.assign(p, partFromForm(v)); save('저장했습니다. 비즈센터 파트너 상세에 반영됩니다'); }); }
    else if (a === 'as-add') { db.assigns.push({ cust: UI.assignCust || MK.me(), partner: Number(b.getAttribute('data-p')), month: db.month, date: MK.today(), status: 'new' }); save('후보로 배정했습니다'); }
    else if (a === 'as-del') { var cu = UI.assignCust || MK.me(), pp = b.getAttribute('data-p'); db.assigns = db.assigns.filter(function (q) { return !(q.cust === cu && String(q.partner) === pp && q.month === db.month); }); save('후보에서 뺐습니다'); }
    else if (a === 'meet-new') openForm('미팅 추가', meetForm(), { cust: MK.me(), status: 'pending', kind: '첫 미팅', marketer: '담당 마케터 A' }, function (v) { var m = { id: MK.nextId('m'), status: 'requested', charged: false }; db.meetings.push(m); applyMeet(m, v); save('미팅을 추가했습니다'); });
    else if (a === 'meet-edit') { var m = MK.meeting(id); openForm('미팅 일정 · 링크', meetForm(), Object.assign({}, m, { partner: String(m.partner) }), function (v) { applyMeet(m, v); save('저장했습니다'); }); }
    else if (a === 'meet-confirm') { var m2 = MK.meeting(id); if (!m2.date || !m2.meet) { toast('날짜와 구글 미트 링크를 넣어 주세요'); openForm('미팅 일정 · 링크', meetForm(), Object.assign({}, m2, { partner: String(m2.partner), status: 'confirmed' }), function (v) { applyMeet(m2, v); save('확정했습니다. 토큰 250을 차감했습니다'); }); return; } MK.confirmMeeting(id); save('확정했습니다. 토큰 250을 차감했습니다'); }
    else if (a === 'meet-done') { MK.meeting(id).status = 'done'; save('완료로 바꿨습니다. 회의록을 등록해 주세요'); }
    else if (a === 'min-new') { var mid = b.getAttribute('data-meet'); openForm('회의록 등록', minForm(mid), { meeting: mid }, function (v) { var mm = MK.meeting(v.meeting); if (!mm) return toast('미팅을 골라 주세요'); db.minutes.push({ id: MK.nextId('n'), meeting: mm.id, cust: mm.cust, partner: mm.partner, date: v.date || MK.today(), title: v.title || '회의록', summary: v.summary || '', url: v.url || '', html: v.html || '' }); save('회의록을 등록했습니다. 비즈센터에서 열 수 있습니다'); }); }
    else if (a === 'min-edit') { var n = db.minutes.filter(function (q) { return q.id === id; })[0]; openForm('회의록 수정', minForm(n.meeting), n, function (v) { var html = v.html || n.html; Object.assign(n, v); n.html = html; save('저장했습니다'); }); }
    else if (a === 'min-open') { var n2 = db.minutes.filter(function (q) { return q.id === id; })[0]; window.open(n2.html ? MK.minuteUrl(n2) : '../adcenter/' + n2.url, '_blank'); }
    else if (a === 'min-del') { if (confirm('이 회의록을 삭제할까요?')) { db.minutes = db.minutes.filter(function (q) { return q.id !== id; }); save('삭제했습니다'); } }
    else if (a === 'led-all') { UI.ledgerCust = ''; render(); }
    else if (a === 'led-new') { var cust = UI.ledgerCust; openForm('토큰 내역 추가', [{ k: 'type', l: '구분', t: 'select', o: TYPES }, { k: 'amount', l: '토큰', t: 'number', def: 250, hint: '차감은 자동으로 빼고 계산합니다.' }, { k: 'date', l: '날짜', t: 'date', def: MK.today() }, { k: 'memo', l: '메모' }], {}, function (v) { MK.addLedger(cust, v.type, Math.abs(v.amount) * (v.type === '차감' ? -1 : 1), v.memo, v.date); save('토큰 내역을 추가했습니다'); }); }
    else if (a === 'led-month') { var c2 = MK.customer(UI.ledgerCust); MK.addLedger(c2.id, '지급', c2.monthTokens, '월 지급'); save(c2.monthTokens + '토큰을 지급했습니다'); }
    else if (a === 'led-del') { if (confirm('이 내역을 삭제할까요?')) { db.ledger = db.ledger.filter(function (q) { return q.id !== id; }); save('삭제했습니다'); } }
    else if (a === 'inq-del') { if (confirm('이 상담 신청을 삭제할까요?')) { db.inquiries = db.inquiries.filter(function (q) { return q.id !== id; }); save('삭제했습니다'); } }
    else if (a === 'blog-tg') { db.blog.forEach(function (q) { if (q.slug === b.getAttribute('data-s')) q.visible = !q.visible; }); save('바꿨습니다. 블로그 목록에 반영됩니다'); }
    else if (a === 'faq-new') openForm('질문 추가', FAQ_F, { visible: '1' }, function (v) { v.id = MK.nextId('f'); v.visible = !!v.visible; db.faq.push(v); save('추가했습니다'); });
    else if (a === 'faq-edit') { var f = db.faq.filter(function (q) { return q.id === id; })[0]; openForm('질문 수정', FAQ_F, Object.assign({}, f, { visible: f.visible ? '1' : '' }), function (v) { v.visible = !!v.visible; Object.assign(f, v); save('저장했습니다'); }); }
    else if (a === 'faq-up') { var i = db.faq.findIndex(function (q) { return q.id === id; }); if (i > 0) { var tmp = db.faq[i - 1]; db.faq[i - 1] = db.faq[i]; db.faq[i] = tmp; save('순서를 바꿨습니다'); } }
    else if (a === 'faq-del') { if (confirm('이 질문을 삭제할까요?')) { db.faq = db.faq.filter(function (q) { return q.id !== id; }); save('삭제했습니다'); } }
  });

  function bulk() {
    var db = D(), plans = [['3개월', 250], ['6개월', 300], ['1년', 350]], mk = ['담당 마케터 A', '담당 마케터 B', '담당 마케터 C', '담당 마케터 D', '담당 마케터 E'];
    var prods = ['스킨케어', '가공식품', '생활용품', '소형 가전', '건강기능식품', '침구', '패션잡화', '산업 부품', '주방용품', '반려동물 용품'];
    var ends = ['2026.11.30', '2026.12.31', '2027.01.31', '2027.03.31', '2027.06.30', '2027.09.30'];
    var start = db.customers.length;
    for (var i = 1; i <= 100; i++) {
      var pl = plans[i % 3], id = MK.nextId('c'), no = String(start + i).padStart(3, '0');
      db.customers.push({ id: id, name: '샘플 고객사 ' + no, email: 'client' + no + '@example.com', plan: pl[0], period: '2026.' + String((i % 9) + 1).padStart(2, '0') + '.01 ~ ' + ends[i % ends.length], monthTokens: pl[1], marketer: mk[i % 5], product: prods[i % prods.length] });
      MK.addLedger(id, '지급', pl[1], '10월 월 지급', '2026-10-01');
      if (i % 4 === 0) MK.addLedger(id, '차감', -250, '온라인 미팅', '2026-10-15');
      if (i % 7 === 0) MK.addLedger(id, '충전', 500, '토큰 충전', '2026-10-10');
      if (i % 9 !== 0) for (var j = 0; j < (i % 6) + 2; j++) db.assigns.push({ cust: id, partner: ((i + j) % db.partners.length) + 1, month: db.month, date: '2026-10-01', status: 'new' });
      if (i % 5 === 0) db.meetings.push({ id: MK.nextId('m'), cust: id, partner: (i % db.partners.length) + 1, date: i % 10 === 0 ? '' : '2026-11-' + String((i % 27) + 1).padStart(2, '0'), time: '14:00', status: i % 10 === 0 ? 'requested' : 'confirmed', kind: '첫 미팅', agenda: '', meet: i % 10 === 0 ? '' : 'https://meet.google.com/', marketer: mk[i % 5], charged: i % 10 !== 0 });
    }
    save('시연용 고객사 100곳을 채웠습니다');
  }
  document.getElementById('reset').addEventListener('click', function () { if (confirm('시연 데이터를 처음 상태로 되돌릴까요? 관리자에서 바꾼 내용이 모두 사라집니다.')) { MK.reset(); UI = { lists: {} }; saveUI(); render(); toast('처음 상태로 되돌렸습니다'); } });
  render();
})();
