// sign.js (ES Module)
(() => {
  // ---- DOM 참조 ----
  const form      = document.getElementById('signupForm');
  const nameEl    = document.getElementById('name');
  const emailEl   = document.getElementById('email');
  const pwEl      = document.getElementById('password');
  const confirmEl = document.getElementById('confirm');
  const tosEl     = document.getElementById('tos');
  const ageEl     = document.getElementById('age');
  const marketingEl = document.getElementById('marketing');
  const submitBtn = document.getElementById('submitBtn');

  // 필드별 에러 영역 (HTML에 있는 경우만 사용)
  const nameErr     = document.getElementById('nameErr');
  const emailErr    = document.getElementById('emailErr');
  const passwordErr = document.getElementById('passwordErr');
  const confirmErr  = document.getElementById('confirmErr');

  // (선택) 비밀번호 강도 막대가 있을 때
  const pwBar = document.getElementById('pwBar');

  // ---- 유틸: 에러 표시/숨김 ----
  function show(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
  function hide(el) {
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
  }
  function clearErrors() {
    hide(nameErr); hide(emailErr); hide(passwordErr); hide(confirmErr);
  }

  // ---- 클라 1차 검증 ----
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function validateClient() {
    clearErrors();

    const name = (nameEl.value || '').trim();
    const email = (emailEl.value || '').trim().toLowerCase();
    const pw = pwEl.value || '';
    const cfm = confirmEl.value || '';

    if (!name) { show(nameErr, '이름을 입력해 주세요.'); nameEl.focus(); return false; }
    if (!email || !EMAIL_RE.test(email)) { show(emailErr, '유효한 이메일을 입력해 주세요.'); emailEl.focus(); return false; }
    if (pw.length < 8) { show(passwordErr, '비밀번호는 8자 이상이어야 합니다.'); pwEl.focus(); return false; }
    if (pw !== cfm) { show(confirmErr, '비밀번호가 일치하지 않습니다.'); confirmEl.focus(); return false; }
    if (!tosEl.checked) { alert('이용약관에 동의해 주세요.'); return false; }
    if (!ageEl.checked) { alert('만 14세 이상만 가입할 수 있습니다.'); return false; }

    return true;
  }

  // ---- 비밀번호 강도(주황색 줄) 업데이트 ----
  function scorePassword(pw) {
    // 아주 단순 점수: 길이 + 숫자/문자/특수문자 포함 여부
    let score = 0;
    if (!pw) return 0;
    score += Math.min(pw.length, 12); // 길이 가점 (최대 12)
    if (/[0-9]/.test(pw)) score += 3;
    if (/[a-z]/.test(pw)) score += 3;
    if (/[A-Z]/.test(pw)) score += 3;
    if (/[^A-Za-z0-9]/.test(pw)) score += 3;
    return Math.min(score, 24); // 0~24
  }

  function updatePwBar() {
    if (!pwBar) return;
    const s = scorePassword(pwEl.value);
    const pct = Math.round((s / 24) * 100); // 0~100%
    pwBar.style.width = pct + '%';
    // 색상(주황 느낌 → 강해질수록 초록으로)
    if (pct < 34) {
      pwBar.style.background = '#ef4444'; // 빨강
    } else if (pct < 67) {
      pwBar.style.background = '#f59e0b'; // 주황
    } else {
      pwBar.style.background = '#16a34a'; // 초록
    }
  }

  pwEl?.addEventListener('input', updatePwBar);
  updatePwBar(); // 초기화

  // ---- 폼 제출 → /signup POST(JSON) ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateClient()) return;

    submitBtn.disabled = true;

    const payload = {
      name: (nameEl.value || '').trim(),
      email: (emailEl.value || '').trim().toLowerCase(),
      password: pwEl.value || '',
      marketing_agree: !!marketingEl?.checked,
    };

    try {
      const res = await fetch('/api/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      // JSON 응답 가정 (sign.py에서 jsonify로 내려줌)
      let data = null;
      try { data = await res.json(); } catch {}

      if (res.ok) {
        // 성공: /login 또는 /signupsuccess 등으로 이동
        const dest = (data && (data.redirect || data.next)) || '/login';
        window.location.assign(dest);
        return;
      }

      // 실패 처리: 서버 message를 적절한 위치에 표시
      const msg = (data && data.message) || '가입에 실패했습니다. 잠시 후 다시 시도해 주세요.';

      // 메시지 내용에 따라 간단 라우팅
      if (/이메일/i.test(msg)) show(emailErr, msg);
      else if (/비밀번호/i.test(msg)) show(passwordErr, msg);
      else show(emailErr || passwordErr || nameErr, msg);

    } catch (err) {
      console.error(err);
      show(emailErr || passwordErr || nameErr, '네트워크 오류가 발생했습니다.');
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
