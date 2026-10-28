/* 비즈센터 화면을 공용 데이터(MK)로 다시 그립니다. 관리자에서 바꾼 내용이 여기로 들어옵니다. */
(function () {
  if (!window.MK) return;
  var page = location.pathname.split('/').pop() || 'index.html';
  var db = MK.db, me = MK.me(), c = MK.customer(me) || db.customers[0], month = db.month;
  var bal = MK.balance(me), assigns = MK.assignsOf(me, month);
  var W = ['일', '월', '화', '수', '목', '금', '토'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function note(msg) { if (window.mkDemo) mkDemo(msg); }
  var BADGE = { meeting: 'status-badge--active', viewed: 'status-badge--upcoming', new: 'status-badge--ended' };
  var monthLabel = month.slice(0, 4) + '년 ' + Number(month.slice(5)) + '월';

  var u = $('.topbar-user span'); if (u) u.textContent = c.email;
  window.addEventListener('storage', function (e) { if (e.key === MK.KEY && !$('input:focus,textarea:focus')) location.reload(); });

  /* 대시보드 */
  var DD = null; try { DD = dashboardData; } catch (e) {}
  if (page === 'index.html' && DD) {
    var ms = MK.meetingsOf(me).filter(function (m) { return m.status !== 'canceled'; });
    var seen = assigns.filter(function (a) { return a.status !== 'new'; }).length;
    ['all', 'month'].forEach(function (k) {
      var s = DD[k].stats;
      s.candidates = assigns.length; s.tokensUsed = MK.used(me, month); s.monthTokens = c.monthTokens; s.tokens = bal;
      s.viewed = seen; s.contacts = seen;
      s.meetings = k === 'all' ? ms.length : ms.filter(function (m) { return (m.date || '').slice(0, 7) === month; }).length;
    });
    var rt = $('.ring-title'); if (rt) rt.textContent = c.plan + ' 플랜 · ' + c.period;
    var tb = $$('.simple-list tbody');
    if (tb[0]) tb[0].innerHTML = assigns.slice(0, 5).map(function (a) { var p = MK.partner(a.partner) || {}; return '<tr><td><a href="buyer.html?id=' + p.id + '" style="color:#333;text-decoration:none;font-weight:700;">' + esc(p.name) + '</a></td><td>' + esc(p.region) + '</td><td>' + esc(p.industry) + '</td><td>' + MK.ASSIGN[a.status] + '</td></tr>'; }).join('') || '<tr><td colspan="4">이번 달 후보를 준비하고 있습니다</td></tr>';
    if (tb[1]) tb[1].innerHTML = ms.slice().reverse().slice(0, 4).map(function (m) { return '<tr><td>' + esc(MK.pname(m.partner)) + '</td><td>' + (m.date ? m.date + ' ' + m.time : '일정 조율 중') + '</td><td>' + MK.STATUS[m.status] + '</td></tr>'; }).join('') || '<tr><td colspan="3">미팅이 없습니다</td></tr>';
    if (tb[2]) tb[2].innerHTML = MK.minutesOf(me).slice(0, 3).map(function (n) { return '<tr><td>' + esc(MK.pname(n.partner)) + '</td><td><a href="buyer.html?id=' + n.partner + '#notes" style="color:#1faf8a;text-decoration:none;">' + esc(n.title) + '</a></td><td>' + n.date + '</td></tr>'; }).join('') || '<tr><td colspan="3">회의록이 없습니다</td></tr>';
  }

  /* 파트너 후보 */
  if (page === 'buyers.html') {
    var bb = $('.mk-banner b'); if (bb) bb.textContent = monthLabel + ' 파트너 후보 ' + assigns.length + '곳';
    var bl = $('.mk-banner-left'); if (bl) bl.innerHTML = '남은 토큰 <b>' + bal.toLocaleString() + '</b> · 미팅 1회 250토큰';
    var rows = '', cards = '';
    assigns.forEach(function (a, i) {
      var p = MK.partner(a.partner) || {}, lab = MK.ASSIGN[a.status], cls = BADGE[a.status];
      rows += '<tr><td class="mk-no">' + (i + 1) + '</td><td><div class="campaign-name">' + esc(p.name) + '</div><div class="campaign-brand">' + esc(p.en) + '</div></td>' +
        '<td><span class="media-pill mk-pill">' + esc(p.industry) + '</span></td><td class="mk-cell">' + esc(p.region) + '</td><td class="mk-cell mk-muted mk-items">' + esc(p.items) + '</td><td class="mk-cell mk-muted">' + a.date.replace(/-/g, '.') + '</td>' +
        '<td><a class="mk-lockchip" href="buyer.html?id=' + p.id + '"><i class="ti ti-address-book"></i> 보기</a></td><td><span class="status-badge ' + cls + '">' + lab + '</span></td><td><a class="mk-detail" href="buyer.html?id=' + p.id + '">상세 보기</a></td></tr>';
      cards += '<a class="ccard" href="buyer.html?id=' + p.id + '"><div class="ccard-top"><div class="ccard-title-wrap"><div class="ccard-title">' + esc(p.name) + '</div><div class="ccard-brand">' + esc(p.en) + '</div></div><span class="status-badge ' + cls + '">' + lab + '</span></div><div class="ccard-pills"><span class="media-pill mk-pill">' + esc(p.industry) + '</span><span>' + esc(p.region) + ' · ' + esc(p.items) + '</span></div></a>';
    });
    var tbody = $('.adv-table tbody'); if (tbody) tbody.innerHTML = rows || '<tr><td colspan="9" style="text-align:center;padding:40px;color:#8d91a9">이번 달 후보를 준비하고 있습니다</td></tr>';
    var cc = $('.campaign-cards'); if (cc) cc.innerHTML = cards;
  }

  /* 파트너 상세 */
  if (page === 'buyer.html') {
    var pid = new URLSearchParams(location.search).get('id') || (assigns[0] && assigns[0].partner) || 1;
    var p = MK.partner(pid) || db.partners[0];
    var mine = MK.meetingsOf(me, p.id).filter(function (m) { return m.status !== 'canceled'; });
    var mins = MK.minutesOf(me, p.id);
    var asg = db.assigns.filter(function (a) { return a.cust === me && a.partner === p.id; })[0];
    document.title = p.name + ' - MAKENOV 비즈센터';
    $('.cd-title').textContent = p.name;
    $('.mk-hd-badges').innerHTML = '<span class="mk-chip"><i class="ti ti-map-pin"></i> ' + esc(p.region) + '</span><span class="mk-chip">' + esc(p.industry) + '</span>' + (p.verified ? '<span class="mk-chip ok"><i class="ti ti-rosette-discount-check"></i> 사업자 인증</span>' : '');
    $('.mk-hd-sub').textContent = p.en + ' · 관심 품목 ' + p.items;
    var req = $('.mk-b2.pri');
    if (req) { req.removeAttribute('onclick'); req.addEventListener('click', function (e) { e.preventDefault(); MK.requestMeeting(me, p.id); note('미팅을 신청했습니다. 전담 마케터가 일정을 잡아 드립니다'); setTimeout(function () { location.reload(); }, 1200); }); }

    // 진행 단계
    var done = mine.filter(function (m) { return m.status === 'done'; });
    var next = mine.filter(function (m) { return m.status !== 'done'; })[0];
    var steps = [
      ['후보 제안', asg ? asg.date : '', 'ti-check'],
      ['미팅 신청', mine[0] ? (mine[0].requestedAt || mine[0].date) : '', 'ti-check'],
      ['첫 미팅', done[0] ? done[0].date : '', 'ti-check'],
      ['회의록 등록', mins.length ? mins[0].date : '', 'ti-check'],
      ['후속 미팅', done.length && next ? (next.date || '일정 조율 중') : '', 'ti-video']
    ];
    var curSet = false;
    $('.mk-steps').innerHTML = steps.map(function (s, i) {
      var isDone = !!s[1] && i < 4, isCur = false;
      if (i === 4 && s[1]) isCur = true;
      if (!isDone && !isCur && !curSet) { isCur = true; curSet = true; }
      if (isCur) curSet = true;
      var label = s[1] ? s[1].replace(/-/g, '.') + (i === 4 ? ' 예정' : '') : (isCur ? '진행 중' : '');
      return '<li class="' + (isDone ? 'done' : isCur ? 'cur' : '') + '"><span class="ic"><i class="ti ' + (isDone ? 'ti-check' : isCur ? 'ti-dots' : 'ti-circle') + '"></i></span><b>' + s[0] + '</b><small>' + label + '</small></li>';
    }).join('');

    // 파트너 정보
    var info = $('#p-info .mk-info');
    if (info) info.innerHTML =
      '<div><dt>업종</dt><dd>' + esc(p.desc || p.industry) + '</dd></div><div><dt>관심 품목</dt><dd>' + esc(p.items) + '</dd></div>' +
      '<div><dt>희망 조건</dt><dd>' + esc(p.wants || '-') + '</dd></div><div><dt>홈페이지</dt><dd>' + (p.homepage ? '<a class="mk-link" href="' + esc(/^https?:/.test(p.homepage) ? p.homepage : 'https://' + p.homepage) + '" target="_blank" rel="noopener"><i class="ti ti-world"></i> ' + esc(p.homepage) + ' <i class="ti ti-external-link"></i></a>' : '-') + '</dd></div>' +
      (p.memo ? '<div class="full"><dt>비고</dt><dd>' + esc(p.memo) + '</dd></div>' : '');
    var sl = $('#mk-sl');
    if (sl) {
      var photos = (p.photos || []).filter(Boolean), n = photos.length || 1;
      sl.innerHTML = '<div class="mk-sl-track">' + (photos.length ? photos.map(function (src) { return '<div class="mk-sl-item"><img src="' + esc(src) + '" alt="' + esc(p.name) + '"></div>'; }).join('') : '<div class="mk-sl-item"><i class="ti ti-photo"></i><small>등록된 사진이 없습니다</small></div>') + '</div>' +
        (n > 1 ? '<button type="button" class="mk-sl-btn prev" aria-label="이전 사진"><i class="ti ti-chevron-left"></i></button><button type="button" class="mk-sl-btn next" aria-label="다음 사진"><i class="ti ti-chevron-right"></i></button>' : '') + '<span class="mk-sl-count">1 / ' + n + '</span>';
      var tr = $('.mk-sl-track', sl), cnt = $('.mk-sl-count', sl);
      var idx = function () { return Math.round(tr.scrollLeft / tr.clientWidth); };
      var go = function (k) { k = (k + n) % n; tr.scrollTo({ left: k * tr.clientWidth }); };
      if (n > 1) { $('.prev', sl).onclick = function () { go(idx() - 1); }; $('.next', sl).onclick = function () { go(idx() + 1); }; }
      tr.addEventListener('scroll', function () { cnt.textContent = (idx() + 1) + ' / ' + n; }, { passive: true });
    }
    var addr = $('.mk-addr'); if (addr) addr.innerHTML = '<i class="ti ti-map-pin-filled"></i> ' + esc(p.address || p.region);
    var ifr = $('.mk-map iframe'); if (ifr) ifr.src = 'https://www.google.com/maps?q=' + encodeURIComponent(p.address || p.region) + '&hl=ko&z=14&output=embed';
    var ct = $('.mk-info.one'); if (ct) ct.innerHTML = '<div><dt>담당자</dt><dd>' + esc(p.contactName || '-') + '</dd></div><div><dt>이메일</dt><dd>' + esc(p.email || '-') + '</dd></div><div><dt>전화</dt><dd>' + esc(p.phone || '-') + '</dd></div>';

    // 미팅
    var mcard = $('#p-meet .card');
    if (mcard) {
      var list = mine.slice().sort(function (a, b) { var ua = a.status === 'done' ? 1 : 0, ub = b.status === 'done' ? 1 : 0; return ua - ub || ((ua ? b : a).date + (ua ? b : a).time).localeCompare((ua ? a : b).date + (ua ? a : b).time); });
      var html = '<div class="card-title"><i class="ti ti-calendar-event"></i> 미팅 일정</div>';
      html += list.map(function (m) {
        var d = m.date ? new Date(m.date + 'T' + (m.time || '00:00')) : null;
        var md = d ? '<div class="mk-md"><small>' + (d.getMonth() + 1) + '월</small><b>' + String(d.getDate()).padStart(2, '0') + '</b><span>' + W[d.getDay()] + '요일</span></div>' : '<div class="mk-md"><small>일정</small><b>?</b><span>조율 중</span></div>';
        var stc = m.status === 'done' ? 'd' : 'c';
        var title = '<div class="mk-mt"><span class="mk-st ' + stc + '">' + MK.STATUS[m.status] + '</span>' + esc(m.kind || '미팅') + (m.agenda ? ' · ' + esc(m.agenda) : '') + '</div>';
        var meta = '<div class="mk-mm">' + (m.time ? '<span><i class="ti ti-clock"></i> ' + m.time + '</span>' : '') + '<span><i class="ti ti-brand-google"></i> 구글 미트</span>' + (m.status === 'done' ? '<span><i class="ti ti-coins"></i> 250토큰 사용</span>' : '<span><i class="ti ti-language"></i> 전담 마케터 통역</span>') + '</div>';
        if (m.status === 'done') {
          var mn = mins.filter(function (x) { return x.meeting === m.id; })[0];
          return '<div class="mk-meet past">' + md + '<div class="mk-mi">' + title + meta + '</div>' + (mn ? '<a href="' + esc(MK.minuteUrl(mn)) + '" target="_blank" rel="noopener" class="mk-join ghost"><i class="ti ti-notes"></i> 회의록 보기</a>' : '<span class="mk-join ghost" style="opacity:.6">회의록 준비 중</span>') + '</div>';
        }
        if (m.status === 'confirmed' && m.date) {
          return '<div class="mk-meet up" data-at="' + m.date + 'T' + m.time + '">' + md + '<div class="mk-mi">' + title + meta + '<div class="mk-cd"><i class="ti ti-bell-ringing"></i> <span class="mk-left">남은 시간 계산 중</span></div></div>' +
            (m.meet ? '<a href="' + esc(m.meet) + '" target="_blank" rel="noopener" class="mk-join"><i class="ti ti-video"></i> 입장하기</a>' : '<a href="#" class="mk-join" onclick="mkDemo(\'미팅 링크가 아직 등록되지 않았습니다\');return false;"><i class="ti ti-video"></i> 입장하기</a>') + '</div>';
        }
        return '<div class="mk-meet">' + md + '<div class="mk-mi">' + title + meta + '<div class="mk-cd soon"><i class="ti ti-hourglass"></i> 전담 마케터가 일정을 잡고 있습니다</div></div></div>';
      }).join('') || '<div class="desc">아직 미팅이 없습니다. 위쪽 "미팅 신청"을 누르면 전담 마케터가 일정을 잡아 드립니다.</div>';
      html += '<div class="mk-tok"><div class="progress-wrap"><div class="progress-bar" style="width:' + Math.min(100, Math.round(bal / Math.max(1, bal + MK.used(me, month)) * 100)) + '%"></div></div><div class="progress-label">남은 토큰 ' + bal.toLocaleString() + ' · 이번 달 사용 ' + MK.used(me, month).toLocaleString() + '토큰 · 월 지급 ' + c.monthTokens + '토큰</div></div>';
      mcard.innerHTML = html;
      if (window.mkTick) mkTick();
    }
    // 회의록
    var ncard = $('#p-notes .card');
    if (ncard) ncard.innerHTML = '<div class="card-title"><i class="ti ti-notes"></i> 회의록</div>' + (mins.map(function (n) {
      var url = MK.minuteUrl(n), d = n.date.split('-');
      var inner = '<div class="mk-nd"><b>' + d[1] + '.' + d[2] + '</b><small>' + d[0] + '</small></div><div class="mk-nt"><b>' + esc(n.title) + '</b><p>' + esc(n.summary) + '</p></div>';
      return url ? '<a class="mk-note" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + '<span class="mk-no"><i class="ti ti-file-text"></i> 열기 <i class="ti ti-external-link"></i></span></a>' : '<div class="mk-note">' + inner + '<span class="mk-no" style="color:#8d91a9">문서 준비 중</span></div>';
    }).join('') || '<div class="desc">아직 등록된 회의록이 없습니다.</div>') + '<div class="desc">회의록은 전담 마케터가 문서로 올립니다. 누르면 새 창에서 열립니다.</div>';
    var cnts = $$('.cd-tab .cnt'); if (cnts[0]) cnts[0].textContent = mine.length; if (cnts[1]) cnts[1].textContent = mins.length;
    if (asg && asg.status === 'new') { MK.markAssign(me, p.id, 'viewed'); MK.save(); }
  }

  /* 토큰·플랜 */
  if (page === 'tokens.html') {
    var sub = $('.plans-sub'); if (sub) sub.innerHTML = sub.innerHTML.replace(/지금 이용 중인 플랜은 .*?입니다\./, '지금 이용 중인 플랜은 ' + esc(c.plan) + ' 플랜이며 남은 토큰은 ' + bal.toLocaleString() + '개입니다.');
    document.addEventListener('click', function (e) {
      var b = e.target.closest('a,button'); if (!b || b.textContent.indexOf('충전하기') < 0) return;
      var box = b.parentElement; while (box && !/토큰 ([\d,]+)개/.test(box.textContent)) box = box.parentElement;
      if (!box) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var amt = Number(box.textContent.match(/토큰 ([\d,]+)개/)[1].replace(/,/g, ''));
      MK.addLedger(me, '충전', amt, '토큰 충전 (비즈센터)'); MK.save();
      note(amt.toLocaleString() + '토큰을 충전했습니다'); setTimeout(function () { location.reload(); }, 1200);
    }, true);
  }
})();
