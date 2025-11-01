// static/js/post.js (단일 이미지 업로드 버전 - 수정됨)
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => {
    const parent = el || document;
    if (!parent || !parent.querySelectorAll) {
      return [];
    }
    return Array.from(parent.querySelectorAll(sel));
  };

  // Elements
  const form = $("#recipeForm");
  const draftBtn = $("#draftBtn");
  const previewBtn = $("#previewBtn");
  const resetBtn = $("#resetBtn");
  const submitBtn = $("#submitBtn");

  const titleEl = $("#title");
  const servingsEl = $("#servings");
  const timeEl = $("#time");
  const levelEl = $("#level");
  const categoryEl = $("#category");
  const descEl = $("#desc");

  const tagInput = $("#tagInput");
  const tagList = $("#tagList");

  const ingInput = $("#ingInput");
  const ingList = $("#ingList");

  const stepInput = $("#stepInput");
  const stepMin = $("#stepMin");
  const stepList = $("#stepList");

  const previewSec = $("#preview");
  const pvTitle = $("#pvTitle");
  const pvMeta = $("#pvMeta");
  const pvTags = $("#pvTags");
  const pvIngs = $("#pvIngs");
  const pvSteps = $("#pvSteps");

  // 단일 이미지 관련 요소들
  const imageInput = $("#image");
  const imagePreviewSection = $("#imagePreviewSection");
  const imagePreview = $("#imagePreview");

  // 이미지 관리 변수
  let selectedImage = null;

  // ---------- 이미지 업로드 관련 함수들 ----------
  imageInput?.addEventListener('change', handleImageSelection);

  function handleImageSelection(event) {
    const file = event.target.files[0];
    
    if (!file) {
      hideImagePreview();
      return;
    }
    
    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      event.target.value = '';
      hideImagePreview();
      return;
    }
    
    selectedImage = file;
    showImagePreview(file);
  }

  function showImagePreview(file) {
    if (imagePreviewSection && imagePreview) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreviewSection.style.display = 'block';
      };
      
      reader.readAsDataURL(file);
    }
  }

  function hideImagePreview() {
    if (imagePreviewSection) {
      imagePreviewSection.style.display = 'none';
    }
    if (imagePreview) {
      imagePreview.src = '';
    }
    selectedImage = null;
  }

  // ---------- Tag helpers ----------
  function addTag(value) {
    const v = String(value || "").trim();
    if (!v) return;
    // 중복 방지
    const exists = $$(".token", tagList).some(t => t.dataset.value === v);
    if (exists) return;

    const token = document.createElement("div");
    token.className = "token";
    token.dataset.value = v;
    token.innerHTML = `
      <span># ${escapeHtml(v)}</span>
      <button type="button" aria-label="태그 삭제">&times;</button>
    `;
    token.querySelector("button").addEventListener("click", () => {
      token.remove();
      renderPreview();
    });
    tagList.appendChild(token);
    renderPreview();
  }

  function parseAndAddTags(text) {
    const raw = (text || "").replace(/\r\n/g, "\n");
    const list = raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    list.forEach(addTag);
  }

  // 통합된 클릭 이벤트 리스너
  document.addEventListener("click", (e) => {
    // 태그 추가 버튼
    if (e.target && e.target.id === "addTag") {
      e.preventDefault();
      parseAndAddTags(tagInput?.value);
      if (tagInput) {
        tagInput.value = "";
        tagInput.focus();
      }
    }
    
    // 재료 추가 버튼
    if (e.target && e.target.id === "addIng") {
      e.preventDefault();
      addIngredient(ingInput?.value);
      if (ingInput) {
        ingInput.value = "";
        ingInput.focus();
      }
    }
    
    // 단계 추가 버튼
    if (e.target && e.target.id === "addStep") {
      e.preventDefault();
      addStep(stepInput?.value, stepMin?.value);
      if (stepInput) stepInput.value = "";
      if (stepMin) stepMin.value = "";
      if (stepInput) stepInput.focus();
    }
  });

  tagInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      parseAndAddTags(tagInput.value);
      tagInput.value = "";
    }
  });

  // ---------- Ingredient helpers ----------
  function addIngredient(text) {
    const v = String(text || "").trim();
    if (!v) return;
    const item = document.createElement("div");
    item.className = "item";
    item.dataset.text = v;
    item.innerHTML = `
      <div>${escapeHtml(v)}</div>
      <div class="controls">
        <button type="button" class="btn small">삭제</button>
      </div>
    `;
    item.querySelector(".btn").addEventListener("click", () => {
      item.remove();
      renderPreview();
    });
    ingList.appendChild(item);
    renderPreview();
  }

  ingInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient(ingInput.value);
      ingInput.value = "";
    }
  });

  // ---------- Step helpers ----------
  function addStep(text, min) {
    const t = String(text || "").trim();
    if (!t) return;
    const m = Number(min || 0);
    const item = document.createElement("div");
    item.className = "item";
    item.dataset.text = t;
    item.dataset.min = String(isFinite(m) ? Math.max(0, Math.floor(m)) : 0);
    item.innerHTML = `
      <div>${escapeHtml(t)} ${m ? `<span class="hint">(${m}분)</span>` : ""}</div>
      <div class="controls">
        <button type="button" class="btn small">삭제</button>
      </div>
    `;
    item.querySelector(".btn").addEventListener("click", () => {
      item.remove();
      renderPreview();
    });
    stepList.appendChild(item);
    renderPreview();
  }

  stepInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStep(stepInput.value, stepMin.value);
      stepInput.value = "";
      stepMin.value = "";
    }
  });

  // ---------- Preview ----------
  function renderPreview() {
    // 제목/메타
    if (pvTitle) pvTitle.textContent = titleEl.value.trim() || "제목 없음";
    const servings = Number(servingsEl.value || 0);
    const time = Number(timeEl.value || 0);
    const level = levelEl.value || "";
    const category = (categoryEl?.value || "").trim();

    const meta = [];
    if (category) meta.push(`카테고리 ${escapeHtml(category)}`);
    if (servings) meta.push(`${servings}인분`);
    if (time) meta.push(`조리 ${time}분`);
    if (level) meta.push(`난이도 ${escapeHtml(level)}`);
    if (pvMeta) pvMeta.textContent = meta.join(" · ");

    // 태그
    if (pvTags) {
      pvTags.innerHTML = "";
      const tokens = $$(".token", tagList).map(t => t.dataset.value);
      tokens.forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = `# ${t}`;
        pvTags.appendChild(span);
      });
    }

    // 재료
    if (pvIngs) {
      pvIngs.innerHTML = "";
      $$(".item", ingList).forEach(it => {
        const li = document.createElement("li");
        li.textContent = it.dataset.text;
        pvIngs.appendChild(li);
      });
    }

    // 스텝
    if (pvSteps) {
      pvSteps.innerHTML = "";
      $$(".item", stepList).forEach(it => {
        const li = document.createElement("li");
        const t = it.dataset.text;
        const m = Number(it.dataset.min || 0);
        li.textContent = t + (m ? ` (${m}분)` : "");
        pvSteps.appendChild(li);
      });
    }
  }

  // 미리보기 토글
  previewBtn?.addEventListener("click", () => {
    previewSec.hidden = !previewSec.hidden;
    if (!previewSec.hidden) renderPreview();
  });

  // 폼 입력 변화 시 자동 미리보기 갱신
  [titleEl, servingsEl, timeEl, levelEl, categoryEl, descEl].forEach(el => {
    el?.addEventListener("input", () => {
      if (!previewSec.hidden) renderPreview();
    });
  });

  // 단축키: Ctrl/Cmd + K (미리보기), Ctrl/Cmd + Enter (발행)
  document.addEventListener("keydown", (e) => {
    const isMod = e.ctrlKey || e.metaKey;
    if (!isMod) return;
    if (e.key.toLowerCase() === "k") {
      e.preventDefault();
      previewBtn?.click();
    } else if (e.key === "Enter") {
      e.preventDefault();
      submitBtn?.click();
    }
  });

  // 초기화
  resetBtn?.addEventListener("click", () => {
    if (tagList) tagList.innerHTML = "";
    if (ingList) ingList.innerHTML = "";
    if (stepList) stepList.innerHTML = "";
    
    // 이미지 초기화
    hideImagePreview();
    if (imageInput) imageInput.value = '';
    
    renderPreview();
  });

  // 임시저장 (로컬스토리지)
  draftBtn?.addEventListener("click", () => {
    const draft = collectPayload();
    try {
      localStorage.setItem("recipe_draft", JSON.stringify(draft));
      alert("임시저장 완료!");
    } catch (e) {
      console.error(e);
      alert("임시저장 실패");
    }
  });

  // 발행하기
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitPost();
  });

  // ---------- Submit ----------
  async function submitPost() {
    console.log("submitPost 함수 실행됨");
    
    const payload = collectPayload();
    console.log("수집된 데이터:", payload);

    if (!payload.title) { 
      console.log("제목 없음");
      alert("제목을 입력해 주세요."); 
      titleEl?.focus(); 
      return; 
    }
    
    if (payload.title.length > 30) {
      console.log("제목 길이 초과:", payload.title.length);
      alert("제목은 30자 이내로 입력해 주세요.");
      titleEl?.focus();
      return;
    }
    
    if (payload.servings <= 0) { 
      console.log("분량 오류:", payload.servings);
      alert("분량은 1 이상이어야 합니다."); 
      servingsEl?.focus(); 
      return; 
    }

    console.log("검증 통과, FormData 생성 중...");

    // FormData 구성 (단일 이미지)
    const fd = new FormData();
    fd.append("title", payload.title);
    fd.append("servings", String(payload.servings));
    fd.append("time", String(payload.time));
    fd.append("level", payload.level);
    fd.append("category", payload.category);
    fd.append("desc", payload.desc);
    fd.append("tags", JSON.stringify(payload.tags));
    fd.append("ingredients", JSON.stringify(payload.ingredients));
    fd.append("steps", JSON.stringify(payload.steps));
    
    // 단일 이미지 추가
    if (payload.image) {
      fd.append("image", payload.image);
    }

    try {
      console.log("서버에 요청 전송 중...");
      const res = await fetch("/api/posts", {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      
      console.log("응답 상태:", res.status);
      const data = await res.json().catch(() => ({}));
      console.log("응답 데이터:", data);

      if (res.status === 401) {
        alert(data.message || "로그인이 필요합니다.");
        window.location.assign("/login");
        return;
      }
      if (!res.ok || !data.ok) {
        alert(data.message || "저장 실패");
        return;
      }

      // 성공
      console.log("성공!");
      alert("레시피가 성공적으로 등록되었습니다!");
      window.location.assign(`/search_result?q=${encodeURIComponent(payload.title)}&published=1`);
    } catch (err) {
      console.error("에러:", err);
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  }

  // ---------- Collect ----------
  function collectPayload() {
    const tagsFromTokens = tagList ? $$(".token", tagList).map(t => t.dataset.value) : [];
    const tagsRaw = (tagInput?.value || "").trim();
    const tags = [
      ...tagsFromTokens,
      ...tagsRaw.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
    ];
    // 중복 제거
    const uniqTags = Array.from(new Set(tags));

    const ingredients = ingList ? $$(".item", ingList).map(it => it.dataset.text) : [];
    const steps = stepList ? $$(".item", stepList).map(it => ({
      text: it.dataset.text,
      min: Number(it.dataset.min || 0),
    })) : [];

    return {
      title: (titleEl?.value || "").trim(),
      servings: toInt(servingsEl?.value, 1, 1),
      time: toInt(timeEl?.value, 0, 0),
      level: (levelEl?.value || "").trim(),
      category: (categoryEl?.value || "").trim(),
      desc: (descEl?.value || "").trim(),
      tags: uniqTags,
      ingredients,
      steps,
      image: selectedImage // 단일 이미지
    };
  }

  // ---------- Utils ----------
  function toInt(v, d = 0, min = null) {
    let n = parseInt(v, 10);
    if (isNaN(n)) n = d;
    if (min != null) n = Math.max(min, n);
    return n;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }

  // 토스트 유틸
  function showToast(message) {
    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    Object.assign(toast.style, {
      position: "fixed",
      left: "50%",
      bottom: "32px",
      transform: "translateX(-50%)",
      padding: "12px 16px",
      borderRadius: "10px",
      background: "#111",
      color: "#fff",
      fontWeight: "700",
      boxShadow: "0 6px 20px rgba(0,0,0,.18)",
      zIndex: "9999",
    });
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1200);
  }

  // 드래프트 자동 로드(선택)
  try {
    const saved = localStorage.getItem("recipe_draft");
    if (saved) {
      const d = JSON.parse(saved);
      if (titleEl) titleEl.value = d.title || "";
      if (servingsEl) servingsEl.value = d.servings || "";
      if (timeEl) timeEl.value = d.time || "";
      if (levelEl) levelEl.value = d.level || "";
      if (categoryEl) categoryEl.value = d.category || "";
      if (descEl) descEl.value = d.desc || "";

      (d.tags || []).forEach(addTag);
      (d.ingredients || []).forEach(addIngredient);
      (d.steps || []).forEach(s => addStep(s.text, s.min));
    }
  } catch (e) {
    // ignore
  }
})();