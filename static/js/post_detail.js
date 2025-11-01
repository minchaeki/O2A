// static/js/post_detail.js - 레시피 상세보기 모달 관리 (리뷰 시스템 통합)

/**
 * 레시피 상세보기 모달을 관리하는 클래스
 * - 모달 열기/닫기
 * - 레시피 데이터 API 호출
 * - 좋아요 기능
 * - 리뷰 시스템 연동
 */
class PostDetailModal {
    constructor() {
        // DOM 요소들 참조 저장
        this.modal = document.getElementById('detailModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalBody = document.getElementById('modalBody');
        this.closeBtn = document.getElementById('closeModal');
        this.currentPostData = null; // 현재 표시중인 레시피 데이터
        
        this.initEventListeners();
    }

    /**
     * 이벤트 리스너 초기화
     * - 상세보기 버튼 클릭
     * - 모달 닫기 (X버튼, 백드롭, ESC키)
     */
    initEventListeners() {
        // 상세보기 버튼 클릭 시 (이벤트 위임 사용)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('detail-btn')) {
                const postId = e.target.dataset.postId;
                this.showPostDetail(postId);
            }
        });

        // 모달 닫기 버튼
        this.closeBtn.addEventListener('click', () => this.closeModal());
        
        // 모달 배경 클릭으로 닫기
        this.modal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());
        
        // ESC키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.closeModal();
            }
        });
    }

    /**
     * 레시피 상세 정보를 불러와서 모달에 표시
     * @param {string} postId - 레시피 ID
     */
    async showPostDetail(postId) {
        if (!postId) {
            console.error('Post ID가 없습니다');
            return;
        }

        // 모달 열고 로딩 표시
        this.openModal();
        this.showLoading();

        try {
            // 서버에서 레시피 데이터 조회
            const response = await fetch(`/api/post/${postId}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('로그인이 필요합니다');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const post = await response.json();
            this.currentPostData = post; // 현재 데이터 저장
            
            // 레시피 상세 정보 렌더링
            this.renderPostDetail(post);
            
        } catch (error) {
            console.error('게시물을 불러오는데 실패했습니다:', error);
            this.showError(error.message || '게시물을 불러오는데 실패했습니다. 다시 시도해주세요.');
        }
    }

    /**
     * 모달 열기
     */
    openModal() {
        this.modal.style.display = 'flex';
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    }

    /**
     * 모달 닫기
     */
    closeModal() {
        this.modal.style.display = 'none';
        this.modal.classList.remove('show');
        document.body.style.overflow = 'auto'; // 배경 스크롤 복원
        this.currentPostData = null; // 데이터 초기화
    }

    /**
     * 로딩 상태 표시
     */
    showLoading() {
        this.modalTitle.textContent = '레시피 상세';
        this.modalBody.innerHTML = '<div class="loading">맛있는 레시피를 불러오는 중...</div>';
    }

    /**
     * 에러 메시지 표시
     * @param {string} message - 에러 메시지
     */
    showError(message) {
        this.modalBody.innerHTML = `<div class="error">${message}</div>`;
    }

    /**
     * 레시피 상세 정보를 모달에 렌더링
     * @param {Object} post - 레시피 데이터 객체
     */
    renderPostDetail(post) {
        this.modalTitle.textContent = post.title;

        // HTML 생성
        const detailHTML = this.createDetailHTML(post);
        this.modalBody.innerHTML = detailHTML;

        // 좋아요 버튼 이벤트 연결
        const likeBtn = this.modalBody.querySelector('.detail-like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.handleLike(post._id));
        }

        // 리뷰 섹션 렌더링 (review.js의 reviewSystem 사용)
        const reviewSection = this.modalBody.querySelector('#reviewSection');
        if (reviewSection && window.reviewSystem) {
            window.reviewSystem.renderReviewSection(post._id, reviewSection);
        }
    }

    /**
     * 좋아요 버튼 클릭 처리
     * @param {string} postId - 레시피 ID
     */
    async handleLike(postId) {
        try {
            // 서버에 좋아요 토글 요청
            const response = await fetch(`/api/post/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    alert('로그인이 필요합니다.');
                    window.location.href = '/login';
                    return;
                }
                throw new Error(data.error || '좋아요 처리에 실패했습니다.');
            }
            
            if (data.success) {
                // 모달 내 좋아요 버튼 업데이트
                const likeBtn = this.modalBody.querySelector('.detail-like-btn');
                if (likeBtn) {
                    likeBtn.innerHTML = `❤️ ${data.likes}`;
                    // 좋아요 상태에 따라 CSS 클래스 토글
                    if (data.user_liked) {
                        likeBtn.classList.add('liked');
                    } else {
                        likeBtn.classList.remove('liked');
                    }
                }
                
                // 검색 페이지의 좋아요 버튼들도 동시 업데이트
                const searchPageLikeBtns = document.querySelectorAll(`[data-post-id="${postId}"].like-btn`);
                searchPageLikeBtns.forEach(btn => {
                    btn.innerHTML = `❤️ ${data.likes}`;
                });
                
                // 현재 데이터도 업데이트
                if (this.currentPostData) {
                    this.currentPostData.likes = data.likes;
                    this.currentPostData.user_liked = data.user_liked;
                }
            } else {
                alert(data.error || '좋아요 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error('좋아요 처리 오류:', error);
            alert(error.message || '네트워크 오류가 발생했습니다.');
        }
    }

    /**
     * 레시피 상세 정보 HTML 생성
     * @param {Object} post - 레시피 데이터
     * @returns {string} 생성된 HTML 문자열
     */
    createDetailHTML(post) {
        // 레시피 데이터 구조 분해
        const {
            title,
            desc,
            author_name,
            servings,
            time_minutes,
            level,
            category,
            tags = [],
            ingredients = [],
            steps = [],
            likes = 0,
            image_url,
            created_at,
            user_liked = false,
            avg_rating = 0,
            review_count = 0
        } = post;

        // 생성일을 한국어 형식으로 변환
        const createdDate = created_at ? 
            new Date(created_at.$date || created_at).toLocaleDateString('ko-KR') : '';

        // 이미지 HTML (있으면 img 태그, 없으면 기본 아이콘)
        const imageHTML = image_url ? 
            `<img src="${image_url}" alt="${title}" class="detail-image-auto" onerror="this.style.display='none'">` :
            '<div class="detail-image-auto" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #6c757d; font-size: 48px; height: 280px;">🍽️</div>';

        // 태그 HTML (있는 경우만)
        const tagsHTML = tags.length > 0 ? 
            `<div class="tags">${tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>` : '';

        // 재료 목록 HTML
        const ingredientsHTML = ingredients.length > 0 ?
            `<ul class="ingredients-list">
                ${ingredients.map(ingredient => `<li>${this.escapeHtml(ingredient)}</li>`).join('')}
            </ul>` : '<p style="color: #6c757d; font-style: italic;">재료 정보가 없습니다.</p>';

        // 조리 과정 HTML
        const stepsHTML = steps.length > 0 ?
            `<ol class="steps-list">
                ${steps.map((step, index) => `
                    <li class="step-item">
                        <div class="step-number">${index + 1}</div>
                        <div class="step-content">
                            <div class="step-text">${this.escapeHtml(step.text || step)}</div>
                            ${step.min ? `<div class="step-time">${step.min}분</div>` : ''}
                        </div>
                    </li>
                `).join('')}
            </ol>` : '<p style="color: #6c757d; font-style: italic;">조리과정 정보가 없습니다.</p>';

        // 좋아요 버튼 CSS 클래스 (좋아요 상태에 따라)
        const likeButtonClass = user_liked ? 'detail-like-btn liked' : 'detail-like-btn';

        // 전체 HTML 구성
        return `
            ${imageHTML}
            
            <!-- 레시피 메타 정보 (인분, 시간, 난이도 등) -->
            <div class="detail-meta">
                <div class="detail-meta-item">
                    <div class="detail-meta-label">인분</div>
                    <div class="detail-meta-value">${servings || '-'}인분</div>
                </div>
                <div class="detail-meta-item">
                    <div class="detail-meta-label">조리시간</div>
                    <div class="detail-meta-value">${time_minutes || '-'}분</div>
                </div>
                <div class="detail-meta-item">
                    <div class="detail-meta-label">난이도</div>
                    <div class="detail-meta-value">${level || '-'}</div>
                </div>
                <div class="detail-meta-item">
                    <div class="detail-meta-label">분류</div>
                    <div class="detail-meta-value">${category || '-'}</div>
                </div>
                ${avg_rating > 0 ? `
                <div class="detail-meta-item">
                    <div class="detail-meta-label">평점</div>
                    <div class="detail-meta-value">⭐ ${avg_rating} (${review_count}개)</div>
                </div>
                ` : ''}
            </div>

            <!-- 레시피 설명 (있는 경우만) -->
            ${desc ? `
                <div class="detail-section">
                    <h3>레시피 설명</h3>
                    <div class="detail-description">${this.escapeHtml(desc)}</div>
                </div>
            ` : ''}

            <!-- 태그 (있는 경우만) -->
            ${tagsHTML ? `
                <div class="detail-section">
                    <h3>태그</h3>
                    ${tagsHTML}
                </div>
            ` : ''}

            <!-- 재료 목록 -->
            <div class="detail-section">
                <h3>재료 (${ingredients.length}개)</h3>
                ${ingredientsHTML}
            </div>

            <!-- 조리 과정 -->
            <div class="detail-section">
                <h3>조리과정 (${steps.length}단계)</h3>
                ${stepsHTML}
            </div>

            <!-- 리뷰 섹션 (review.js에서 동적으로 채움) -->
            <div class="detail-section">
                <div id="reviewSection"></div>
            </div>

            <!-- 하단 정보 (작성자, 좋아요 버튼) -->
            <div class="detail-footer">
                <div class="detail-author-info">
                    작성자: <strong>${this.escapeHtml(author_name || '익명')}</strong>
                    ${createdDate ? ` • ${createdDate}` : ''}
                </div>
                <button class="${likeButtonClass}">
                    ❤️ ${likes}
                </button>
            </div>
        `;
    }

    /**
     * XSS 방지를 위한 HTML 이스케이프
     * @param {string} text - 이스케이프할 텍스트
     * @returns {string} 이스케이프된 텍스트
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}