// static/js/search.js - 검색 결과 페이지 관리

/**
 * 페이지 로드 완료 시 초기화
 * - 검색 기능
 * - 정렬 기능  
 * - TOP 10 표시
 * - 좋아요 기능
 */
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소들 참조
    const queryText = document.getElementById('queryText');        // 검색어 표시 영역
    const searchForm = document.getElementById('searchForm');      // 검색 폼
    const searchInput = document.getElementById('q');              // 검색 입력창
    const resultList = document.getElementById('resultList');     // 검색 결과 목록
    const rankList = document.getElementById('rankList');         // TOP 10 순위
    const emptyDiv = document.getElementById('empty');            // 빈 결과 메시지
    const sortTabs = document.querySelectorAll('.tab');          // 정렬 탭들 (인기순, 최신순, 조리시간)
    const fabAdd = document.getElementById('fabAdd');             // 플로팅 추가 버튼 (모바일)
    const addBtn = document.getElementById('addBtn');             // 추가 버튼 (데스크톱)

    // 현재 상태 변수들
    let currentQuery = '';     // 현재 검색어
    let currentSort = 'likes'; // 현재 정렬 방식 (기본값: 좋아요순)

    // URL에서 검색어 가져오기 (?q=떡볶이 형태)
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');

    // 초기화: URL에 검색어가 있으면 바로 검색 실행
    if (initialQuery) {
        currentQuery = initialQuery;
        searchInput.value = initialQuery;                          // 검색창에 검색어 표시
        queryText.textContent = `"${initialQuery}" 검색 결과`;    // 제목 업데이트
        performSearch(initialQuery, currentSort);                 // 검색 수행
    }

    // TOP 10 인기 레시피 로드
    loadTop10();

    /**
     * 검색 폼 제출 이벤트 처리
     * 사용자가 새로운 검색어 입력하고 엔터/검색버튼 클릭 시 실행
     */
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault(); // 기본 폼 제출 방지 (페이지 새로고침 방지)
        
        const query = searchInput.value.trim();
        if (query) {
            currentQuery = query;
            queryText.textContent = `"${query}" 검색 결과`;
            performSearch(query, currentSort);
            
            // 브라우저 URL 업데이트 (뒤로가기 지원)
            const newUrl = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
            window.history.pushState({}, '', newUrl);
        }
    });

    /**
     * 정렬 탭 클릭 이벤트 처리
     * 인기순/최신순/조리시간순 전환
     */
    sortTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 모든 탭의 활성 상태 제거
            sortTabs.forEach(t => t.setAttribute('aria-selected', 'false'));
            // 클릭된 탭만 활성화
            this.setAttribute('aria-selected', 'true');
            
            // 정렬 방식 변경
            currentSort = this.getAttribute('data-sort'); // 'likes', 'recent', 'time'
            
            // 현재 검색어로 다시 검색 (새로운 정렬 적용)
            if (currentQuery) {
                performSearch(currentQuery, currentSort);
            }
        });
    });

    /**
     * 플로팅 추가 버튼 클릭 이벤트 (모바일용)
     */
    if (fabAdd) {
        fabAdd.addEventListener('click', function() {
            window.location.href = '/post'; // 레시피 작성 페이지로 이동
        });
    }

    /**
     * 검색 API 호출 및 결과 처리
     * @param {string} query - 검색어
     * @param {string} sortBy - 정렬 방식 ('likes', 'recent', 'time')
     */
    async function performSearch(query, sortBy = 'likes') {
        try {
            showLoading(); // 로딩 상태 표시
            
            // 서버에 검색 요청
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&sort=${sortBy}`);
            const data = await response.json();
            
            if (data.success) {
                displayResults(data.results); // 검색 결과 화면에 표시
            } else {
                showError(data.error || '검색 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('검색 오류:', error);
            showError('네트워크 오류가 발생했습니다.');
        }
    }

    /**
     * TOP 10 인기 레시피 로드
     * 사이드바에 표시할 인기 레시피 목록
     */
    async function loadTop10() {
        try {
            const response = await fetch('/api/top10');
            const data = await response.json();
            
            if (data.success) {
                displayTop10(data.results);
            }
        } catch (error) {
            console.error('TOP 10 로드 오류:', error);
        }
    }

    /**
     * 검색 결과를 화면에 표시
     * @param {Array} results - 검색 결과 배열
     */
    function displayResults(results) {
        resultList.innerHTML = ''; // 기존 결과 초기화
        emptyDiv.hidden = true;    // 빈 결과 메시지 숨김

        // 검색 결과가 없는 경우
        if (results.length === 0) {
            emptyDiv.hidden = false; // "검색 결과가 없어요" 메시지 표시
            return;
        }

        // 각 레시피에 대해 카드 생성
        results.forEach(post => {
            const card = createPostCard(post);
            resultList.appendChild(card);
        });
    }

    /**
     * 개별 레시피 카드 HTML 생성
     * @param {Object} post - 레시피 데이터
     * @returns {HTMLElement} 생성된 카드 DOM 요소
     */
    function createPostCard(post) {
        const card = document.createElement('div');
        card.className = 'card';
        
        // 카드 HTML 구조 생성
        card.innerHTML = `
        <div class="card-content">
            <!-- 레시피 제목 -->
            <div class="title">${escapeHtml(post.title)}</div>
            
            <!-- 메타 정보 (작성자, 날짜, 시간, 난이도) -->
            <div class="meta">
                <span class="author">${escapeHtml(post.author_name)}</span>
                <span class="date">${post.created_at}</span>
                <span class="time">${post.time_minutes}분</span>
                <span class="level">${escapeHtml(post.level)}</span>
            </div>
            
            <!-- 태그들 (카테고리 + 사용자 태그) -->
            <div class="tags">
                <span class="tag">${escapeHtml(post.category)}</span>
                ${post.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>
        
        <!-- 액션 버튼들 -->
        <div class="actions">
            <button class="detail-btn" data-post-id="${post._id || post.id}">자세히</button>
            <button class="like-btn" data-post-id="${post._id || post.id}">
                ❤️ ${post.likes || 0}
            </button>
        </div>
        `;

        // 좋아요 버튼에 클릭 이벤트 추가
        const likeBtn = card.querySelector('.like-btn');
        likeBtn.addEventListener('click', function() {
            likePost(post._id || post.id); // 전역 함수 호출 (search_result.html에 정의됨)
        });

        return card;
    }

    /**
     * TOP 10 인기 레시피를 사이드바에 표시
     * @param {Array} results - TOP 10 레시피 배열
     */
    function displayTop10(results) {
        rankList.innerHTML = ''; // 기존 목록 초기화
        
        results.forEach((post, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="r-left">
                    <!-- 순위 배지 -->
                    <div class="badge">${index + 1}</div>
                    <!-- 레시피 제목 -->
                    <div class="r-name">${escapeHtml(post.title)}</div>
                </div>
                <!-- 좋아요 수 -->
                <div class="r-like">❤️ ${post.likes}</div>
            `;
            rankList.appendChild(li);
        });
    }

    /**
     * 검색 중 로딩 상태 표시
     */
    function showLoading() {
        resultList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div>검색 중...</div>
            </div>
        `;
        emptyDiv.hidden = true;
    }

    /**
     * 오류 메시지 표시
     * @param {string} message - 표시할 오류 메시지
     */
    function showError(message) {
        resultList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <div>${escapeHtml(message)}</div>
            </div>
        `;
        emptyDiv.hidden = true;
    }

    /**
     * XSS 공격 방지를 위한 HTML 이스케이프
     * @param {string} text - 이스케이프할 텍스트
     * @returns {string} 안전하게 처리된 텍스트
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text; // textContent는 자동으로 HTML 태그를 이스케이프
        return div.innerHTML;
    }
});