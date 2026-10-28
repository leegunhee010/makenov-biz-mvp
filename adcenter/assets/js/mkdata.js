/* 메이크노브 MVP 공용 데이터 (관리자 + 비즈센터 + 소개 사이트)
   시연용: 브라우저 localStorage에 저장합니다. 같은 브라우저 안에서만 공유됩니다. */
(function () {
  var KEY = 'mk-mvp-db-v1';

  var PARTNERS = [
    [1, '호치민 화장품 유통사 A', 'Beauty Distribution A', '호치민', '드럭스토어', '스킨케어, 헤어케어'],
    [2, '하노이 마트 체인 B', 'Mart Chain B', '하노이', '마트', '생활용품, 식품'],
    [3, '다낭 온라인 셀러 C', 'Online Seller C', '다낭', '온라인몰', '뷰티, 소형 가전'],
    [4, '호치민 수입 총판 D', 'Import Distributor D', '호치민', '총판', '건강기능식품'],
    [5, '껀터 약국 체인 E', 'Pharmacy Chain E', '껀터', '약국', '건강, 스킨케어'],
    [6, '하노이 백화점 F', 'Department Store F', '하노이', '백화점', '프리미엄 뷰티'],
    [7, '호치민 홈쇼핑 MD G', 'Home Shopping G', '호치민', '홈쇼핑', '주방, 생활가전'],
    [8, '하이퐁 도매상 H', 'Wholesaler H', '하이퐁', '도매', '생활용품'],
    [9, '호치민 편의점 체인 I', 'Convenience Chain I', '호치민', '편의점', '식품, 음료'],
    [10, '다낭 리조트 구매팀 J', 'Resort Purchasing J', '다낭', '호텔·리조트', '어메니티, 침구']
  ];
  var CITY = { '호치민': 'Ho Chi Minh City', '하노이': 'Hanoi', '다낭': 'Da Nang', '껀터': 'Can Tho', '하이퐁': 'Hai Phong' };

  function seed() {
    var partners = PARTNERS.map(function (p) {
      return {
        id: p[0], name: p[1], en: p[2], region: p[3], industry: p[4], items: p[5],
        desc: '', wants: '', homepage: '', address: CITY[p[3]] + ', Việt Nam', photos: [], memo: '',
        contactName: '구매 담당자 (샘플)', email: 'partner' + p[0] + '@example.com', phone: '+84 90 000 000' + (p[0] % 10),
        verified: p[0] <= 6
      };
    });
    var a = partners[0];
    a.desc = '드럭스토어 (호치민 시내 120곳 납품, 자체 온라인몰 운영)';
    a.wants = '첫 주문 전 샘플 테스트, 베트남 내 독점 유통 협의 희망';
    a.homepage = 'www.partner-a.vn';
    a.address = 'District 1, Ho Chi Minh City, Việt Nam';
    a.memo = '샘플 테스트 결과를 보고 첫 주문 수량을 정하겠다고 했습니다.';
    a.contactName = '구매 담당 매니저 (샘플)';
    a.email = 'partner-a@example.com';
    a.phone = '+84 90 000 0000 (샘플)';

    var st = { 1: 'meeting', 2: 'viewed', 3: 'viewed', 4: 'meeting', 6: 'meeting' };
    var assigns = partners.map(function (p) {
      return { cust: 'c1', partner: p.id, month: '2026-10', date: '2026-10-01', status: st[p.id] || 'new' };
    });
    [7, 8, 9].forEach(function (pid) { assigns.push({ cust: 'c2', partner: pid, month: '2026-10', date: '2026-10-02', status: 'new' }); });
    [10, 2].forEach(function (pid) { assigns.push({ cust: 'c3', partner: pid, month: '2026-10', date: '2026-10-01', status: 'new' }); });

    var M = 'https://meet.google.com/';
    var meetings = [
      { id: 'm1', cust: 'c1', partner: 2, date: '2026-09-09', time: '16:00', status: 'done', kind: '첫 미팅', agenda: '입점 절차와 마진 구조', meet: M, marketer: '담당 마케터 A', charged: true },
      { id: 'm2', cust: 'c1', partner: 1, date: '2026-09-18', time: '11:00', status: 'done', kind: '사전 미팅', agenda: '독점 유통 가능 범위', meet: M, marketer: '담당 마케터 A', charged: true },
      { id: 'm3', cust: 'c1', partner: 1, date: '2026-10-14', time: '15:00', status: 'done', kind: '첫 미팅', agenda: '샘플 발송 조건, 첫 주문 수량', meet: M, marketer: '담당 마케터 A', charged: true },
      { id: 'm4', cust: 'c1', partner: 3, date: '2026-10-29', time: '10:00', status: 'pending', kind: '첫 미팅', agenda: '온라인몰 입점 수수료와 배송 조건', meet: '', marketer: '담당 마케터 A', charged: false },
      { id: 'm5', cust: 'c1', partner: 4, date: '2026-10-30', time: '16:00', status: 'confirmed', kind: '첫 미팅', agenda: '수입 통관 서류와 첫 물량', meet: M, marketer: '담당 마케터 A', charged: true },
      { id: 'm6', cust: 'c1', partner: 1, date: '2026-11-04', time: '15:00', status: 'confirmed', kind: '후속 미팅', agenda: '샘플 테스트 결과 공유', meet: M, marketer: '담당 마케터 A', charged: true },
      { id: 'm7', cust: 'c1', partner: 6, date: '2026-11-12', time: '14:00', status: 'confirmed', kind: '첫 미팅', agenda: '백화점 팝업 입점 일정', meet: M, marketer: '담당 마케터 A', charged: true }
    ];
    var minutes = [
      { id: 'n1', meeting: 'm3', cust: 'c1', partner: 1, date: '2026-10-16', title: '샘플 발송 조건과 첫 주문 수량 협의', summary: '샘플 30개를 11월 첫 주까지 호치민 사무실로 보내기로 했습니다. 첫 주문은 품목당 500개 기준으로 견적을 다시 받기로 했습니다.', url: 'minutes/2026-10-14.html', html: '' },
      { id: 'n2', meeting: 'm2', cust: 'c1', partner: 1, date: '2026-09-19', title: '독점 유통 가능 범위 확인', summary: '호치민과 남부 지역 독점을 우선 검토하고, 6개월 판매 실적을 보고 전국으로 넓히는 방안을 이야기했습니다.', url: 'minutes/2026-09-18.html', html: '' },
      { id: 'n3', meeting: 'm1', cust: 'c1', partner: 2, date: '2026-09-11', title: '입점 절차와 마진 구조 안내', summary: '입점 신청 절차와 마진 구조를 안내받았습니다. 필요한 서류 목록을 받기로 했습니다.', url: '', html: '' }
    ];
    var ledger = [
      { id: 't1', cust: 'c1', date: '2026-09-01', type: '지급', amount: 300, memo: '9월 월 지급' },
      { id: 't2', cust: 'c1', date: '2026-09-08', type: '차감', amount: -250, memo: '하노이 마트 체인 B 미팅' },
      { id: 't3', cust: 'c1', date: '2026-09-15', type: '충전', amount: 500, memo: '토큰 충전' },
      { id: 't4', cust: 'c1', date: '2026-09-16', type: '차감', amount: -250, memo: '호치민 화장품 유통사 A 사전 미팅' },
      { id: 't5', cust: 'c1', date: '2026-10-01', type: '지급', amount: 300, memo: '10월 월 지급' },
      { id: 't6', cust: 'c1', date: '2026-10-05', type: '충전', amount: 750, memo: '토큰 충전' },
      { id: 't7', cust: 'c1', date: '2026-10-08', type: '차감', amount: -250, memo: '호치민 화장품 유통사 A 첫 미팅' },
      { id: 't8', cust: 'c1', date: '2026-10-22', type: '차감', amount: -250, memo: '호치민 수입 총판 D 미팅' },
      { id: 't9', cust: 'c1', date: '2026-10-20', type: '차감', amount: -250, memo: '호치민 화장품 유통사 A 후속 미팅' },
      { id: 't10', cust: 'c1', date: '2026-10-24', type: '차감', amount: -250, memo: '하노이 백화점 F 미팅' },
      { id: 't11', cust: 'c2', date: '2026-10-01', type: '지급', amount: 250, memo: '10월 월 지급' },
      { id: 't12', cust: 'c3', date: '2026-10-01', type: '지급', amount: 350, memo: '10월 월 지급' }
    ];
    return {
      v: 1, meId: 'c1', month: '2026-10', seq: 100,
      customers: [
        { id: 'c1', name: '데모 기업', email: 'demo@makenov.com', plan: '6개월', period: '2026.09.01 ~ 2027.02.28', monthTokens: 300, marketer: '담당 마케터 A', product: '스킨케어, 헤어케어' },
        { id: 'c2', name: '샘플 식품 기업', email: 'food@example.com', plan: '3개월', period: '2026.10.01 ~ 2026.12.31', monthTokens: 250, marketer: '담당 마케터 B', product: '가공식품' },
        { id: 'c3', name: '샘플 침구 기업', email: 'bedding@example.com', plan: '1년', period: '2026.08.01 ~ 2027.07.31', monthTokens: 350, marketer: '담당 마케터 A', product: '침구' }
      ],
      partners: partners, assigns: assigns, meetings: meetings, minutes: minutes, ledger: ledger,
      blog: [
        ['first-online-meeting', '베트남 파트너와 첫 온라인 미팅, 무엇을 준비해야 할까?'],
        ['vietnamese-detail-page', '베트남어 상세페이지, 번역만 하면 될까?'],
        ['choosing-partners', '베트남 파트너 후보, 어떤 기준으로 골라야 할까?'],
        ['proposal-for-partners', '베트남 파트너에게 보낼 제안서, 무엇을 담아야 할까?'],
        ['follow-up-after-meeting', '온라인 미팅이 끝난 뒤, 후속 연락은 어떻게 해야 할까?'],
        ['market-check-vietnam', '우리 제품이 베트남에서 통할지, 어떻게 알아볼까?'],
        ['meeting-with-interpreter', '통역을 끼고 하는 미팅, 무엇을 미리 맞춰 둬야 할까?'],
        ['before-sending-samples', '샘플을 보내기 전에 무엇을 정해 둬야 할까?'],
        ['partner-first-questions', '베트남 파트너가 첫 미팅에서 자주 묻는 질문은?']
      ].map(function (b) { return { slug: b[0], title: b[1], visible: true }; }),
      faq: [
        ['지금 어느 나라를 지원하나요?', '지금은 베트남 서비스를 운영합니다. 다른 나라도 열리는 대로 안내드립니다.'],
        ['토큰은 어디에 쓰나요?', '온라인 미팅에만 씁니다. 미팅 1회에 250토큰이고, 플랜에 따라 매달 250, 300, 350토큰을 드립니다. 부족하면 추가로 충전할 수 있습니다.'],
        ['파트너 정보와 연락처도 돈이 드나요?', '아니요, 무료입니다. 파트너가 공개에 동의한 연락처만 보여 드립니다.'],
        ['후보 중에 마음에 드는 곳이 없으면요?', '10곳 중 고르지 못하면 3곳을 더 제안합니다. 그래도 고르지 못한 달은 토큰을 차감하지 않고 다음 달로 넘깁니다.'],
        ['파트너가 미팅에 안 나오면요?', '토큰을 차감하지 않고 다른 파트너로 다시 잡아 드립니다.'],
        ['계약 기간은 언제부터인가요?', '등록, 상세페이지, 현지화 세팅이 끝난 날부터 시작합니다. 가격은 부가세 별도입니다.']
      ].map(function (f, i) { return { id: 'f' + (i + 1), q: f[0], a: f[1], visible: true }; }),
      inquiries: [
        { id: 'q1', date: '2026-10-26', company: '샘플 화장품 기업', name: '김담당', phone: '010-0000-0000', email: 'cosmetic@example.com', plan: '6개월', category: '뷰티', text: '스킨케어 제품을 베트남 드럭스토어에 넣고 싶습니다.', status: '새 문의' },
        { id: 'q2', date: '2026-10-24', company: '샘플 기계 기업', name: '이담당', phone: '010-0000-0001', email: 'machine@example.com', plan: '1년', category: '산업재', text: '공구 클램핑 장비를 현지 공장에 소개하고 싶습니다.', status: '상담 완료' }
      ]
    };
  }

  var db;
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); if (db && db.v === 1) return; } } catch (e) {}
    db = seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  load();

  function byId(list, id) { for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i]; return null; }
  var MK = {
    KEY: KEY,
    get db() { return db; },
    save: save,
    reload: load,
    reset: function () { db = seed(); save(); },
    nextId: function (p) { db.seq = (db.seq || 100) + 1; return p + db.seq; },
    me: function () { return db.meId || 'c1'; },
    setMe: function (id) { db.meId = id; save(); },
    customer: function (id) { return byId(db.customers, id); },
    partner: function (id) { return byId(db.partners, id); },
    meeting: function (id) { return byId(db.meetings, id); },
    balance: function (cust) { return db.ledger.filter(function (t) { return t.cust === cust; }).reduce(function (s, t) { return s + Number(t.amount || 0); }, 0); },
    used: function (cust, month) { return -db.ledger.filter(function (t) { return t.cust === cust && t.type === '차감' && t.date.slice(0, 7) === month; }).reduce(function (s, t) { return s + Number(t.amount || 0); }, 0); },
    assignsOf: function (cust, month) { return db.assigns.filter(function (a) { return a.cust === cust && (!month || a.month === month); }); },
    meetingsOf: function (cust, partner) { return db.meetings.filter(function (m) { return m.cust === cust && (partner == null || String(m.partner) === String(partner)); }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }); },
    minutesOf: function (cust, partner) { return db.minutes.filter(function (n) { return n.cust === cust && (partner == null || String(n.partner) === String(partner)); }).sort(function (a, b) { return b.date.localeCompare(a.date); }); },
    addLedger: function (cust, type, amount, memo, date) {
      db.ledger.push({ id: MK.nextId('t'), cust: cust, date: date || MK.today(), type: type, amount: Number(amount), memo: memo || '' });
    },
    today: function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    pname: function (id) { var p = MK.partner(id); return p ? p.name : '파트너'; },
    // 미팅 상태 변경과 토큰 처리
    confirmMeeting: function (id) {
      var m = MK.meeting(id); if (!m) return;
      m.status = 'confirmed';
      if (!m.charged) { MK.addLedger(m.cust, '차감', -250, MK.pname(m.partner) + ' ' + (m.kind || '미팅')); m.charged = true; }
      MK.markAssign(m.cust, m.partner, 'meeting');
      save();
    },
    cancelMeeting: function (id, reason) {
      var m = MK.meeting(id); if (!m) return;
      m.status = 'canceled'; m.cancelReason = reason || '';
      if (m.charged) { MK.addLedger(m.cust, '환원', 250, MK.pname(m.partner) + ' 미팅 취소'); m.charged = false; }
      save();
    },
    requestMeeting: function (cust, partner) {
      var m = { id: MK.nextId('m'), cust: cust, partner: Number(partner), date: '', time: '', status: 'requested', kind: MK.meetingsOf(cust, partner).some(function (x) { return x.status === 'done'; }) ? '후속 미팅' : '첫 미팅', agenda: '', meet: '', marketer: (MK.customer(cust) || {}).marketer || '', charged: false, requestedAt: MK.today() };
      db.meetings.push(m); save(); return m;
    },
    markAssign: function (cust, partner, status) {
      db.assigns.forEach(function (a) { if (a.cust === cust && String(a.partner) === String(partner)) a.status = status; });
    },
    // 비즈센터 캘린더 형식
    events: function (cust) {
      return MK.meetingsOf(cust).filter(function (m) { return m.date && m.status !== 'canceled' && m.status !== 'requested'; }).map(function (m) {
        var n = (MK.minutesOf(cust, m.partner)[0] || {});
        return { id: m.id, article_id: m.partner, status: m.status, visit_date: m.date, visit_time: m.time, title: (m.kind || '온라인 미팅') + ' (250토큰)', username: MK.pname(m.partner), visit_name_en: m.marketer || '', visit_people: '전담 마케터 동행', confirmed_at: m.charged ? '확정됨' : '', content_due_at: '', visit_note: m.agenda || '', meet: m.meet || '' };
      });
    },
    minuteUrl: function (n) {
      if (n.html) { try { return URL.createObjectURL(new Blob([n.html], { type: 'text/html' })); } catch (e) {} }
      return n.url || '';
    },
    STATUS: { requested: '신청됨', pending: '확정 대기', confirmed: '확정', done: '완료', canceled: '취소' },
    ASSIGN: { meeting: '미팅 확정', viewed: '열람함', new: '새 후보' }
  };
  window.MK = MK;
})();
