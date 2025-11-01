// mypage.js - 마이페이지 기능 (프로필 편집 기능 포함)
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const myRecipesList = document.getElementById('myRecipesList');
    const likedRecipesList = document.getElementById('likedRecipesList');

    let myRecipesLoaded = false;
    let likedRecipesLoaded = false;

    // 탭 전환 이벤트
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // 활성 탭 변경
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 탭 패널 전환
            tabPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');
            
            // 데이터 로드
            if (targetTab === 'my-recipes' && !myRecipesLoaded) {
                loadMyRecipes();
            } else if (targetTab === 'liked-recipes' && !likedRecipesLoaded) {
                loadLikedRecipes();
            }
        });
    });

    // 초기 로드 - 내 레시피
    loadMyRecipes();

    // 내 레시피 로드
    async function loadMyRecipes() {
        try {
            const response = await fetch('/api/my-recipes');
            const data = await response.json();
            
            if (data.success) {
                renderRecipes(data.recipes, myRecipesList, 'my');
                myRecipesLoaded = true;
            } else {
                showError(myRecipesList, '내 레시피를 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('내 레시피 로드 오류:', error);
            showError(myRecipesList, '네트워크 오류가 발생했습니다.');
        }
    }

    // 좋아요한 레시피 로드
    async function loadLikedRecipes() {
        try {
            const response = await fetch('/api/liked-recipes');
            const data = await response.json();
            
            if (data.success) {
                renderRecipes(data.recipes, likedRecipesList, 'liked');
                likedRecipesLoaded = true;
            } else {
                showError(likedRecipesList, '좋아요한 레시피를 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('좋아요 레시피 로드 오류:', error);
            showError(likedRecipesList, '네트워크 오류가 발생했습니다.');
        }
    }

    // 레시피 목록 렌더링 (클릭 이벤트 제거)
    function renderRecipes(recipes, container, type) {
        if (recipes.length === 0) {
            showEmpty(container, type);
            return;
        }

        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" data-recipe-id="${recipe._id}">
                <div class="recipe-image">
                    ${recipe.image_url ? 
                        `<img src="${recipe.image_url}" alt="${recipe.title}" onerror="this.parentNode.innerHTML='🍽️'">` : 
                        '🍽️'
                    }
                </div>
                <div class="recipe-info">
                    <div class="recipe-title">${escapeHtml(recipe.title)}</div>
                    <div class="recipe-meta">
                        <span class="recipe-category">${escapeHtml(recipe.category || '기타')}</span>
                        <div class="recipe-likes">❤️ ${recipe.likes || 0}</div>
                    </div>
                    ${type === 'my' && recipe.created_at ? 
                        `<div style="margin-top: 8px; font-size: 12px; color: #6b6b6b;">${recipe.created_at}</div>` : 
                        ''
                    }
                    ${type === 'liked' && recipe.author_name ? 
                        `<div style="margin-top: 8px; font-size: 12px; color: #6b6b6b;">by ${escapeHtml(recipe.author_name)}</div>` : 
                        ''
                    }
                    <div class="recipe-actions">
                        ${type === 'my' ? 
                            `<button class="action-btn delete-btn" onclick="deleteRecipe('${recipe._id}', event)">삭제</button>` :
                            `<button class="action-btn unlike-btn" onclick="unlikeRecipe('${recipe._id}', event)">좋아요 취소</button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 빈 상태 표시
    function showEmpty(container, type) {
        const emptyMessages = {
            'my': {
                icon: '📝',
                text: '아직 작성한 레시피가 없습니다.',
                action: '첫 레시피 작성하기',
                link: '/post'
            },
            'liked': {
                icon: '❤️',
                text: '아직 좋아요한 레시피가 없습니다.',
                action: '레시피 둘러보기',
                link: '/search_result?q='
            }
        };

        const message = emptyMessages[type];
        container.innerHTML = `
            <div class="empty">
                <div class="empty-icon">${message.icon}</div>
                <div class="empty-text">${message.text}</div>
                <a href="${message.link}" class="empty-action">${message.action}</a>
            </div>
        `;
    }

    // 에러 표시
    function showError(container, message) {
        container.innerHTML = `
            <div class="empty">
                <div class="empty-icon">⚠️</div>
                <div class="empty-text">${message}</div>
            </div>
        `;
    }

    // 통계 업데이트 함수
    async function updateStats() {
        try {
            // 현재 화면의 카드 개수로 간단히 업데이트
            const myRecipesCount = document.querySelectorAll('#my-recipes .recipe-card').length;
            const likedRecipesCount = document.querySelectorAll('#liked-recipes .recipe-card').length;
            
            const myCountEl = document.querySelector('.stat-card:first-child .stat-number');
            const likedCountEl = document.querySelector('.stat-card:last-child .stat-number');
            
            if (myCountEl) myCountEl.textContent = myRecipesCount;
            if (likedCountEl) likedCountEl.textContent = likedRecipesCount;
            
        } catch (error) {
            console.error('통계 업데이트 오류:', error);
        }
    }

    // HTML 이스케이프
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // 닉네임 입력 시 엔터키로 저장
    const nicknameInput = document.getElementById('nicknameInput');
    if (nicknameInput) {
        nicknameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                saveNickname();
            }
        });
    }

    // 내 레시피 삭제
    window.deleteRecipe = async function(recipeId, event) {
        event.stopPropagation(); // 카드 클릭 이벤트 방지
        
        if (!confirm('정말로 이 레시피를 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/delete-recipe/${recipeId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 화면에서 해당 카드 제거
                const recipeCard = document.querySelector(`[data-recipe-id="${recipeId}"]`);
                if (recipeCard) {
                    recipeCard.remove();
                }
                
                // 통계 업데이트 (페이지 새로고침 없이)
                updateStats();
                
                alert('레시피가 삭제되었습니다.');
            } else {
                alert(data.error || '레시피 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('레시피 삭제 오류:', error);
            alert('네트워크 오류가 발생했습니다.');
        }
    };

    // 좋아요 취소
    window.unlikeRecipe = async function(recipeId, event) {
        event.stopPropagation(); // 카드 클릭 이벤트 방지
        
        if (!confirm('좋아요를 취소하시겠습니까?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/unlike-recipe/${recipeId}`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 화면에서 해당 카드 제거
                const recipeCard = document.querySelector(`[data-recipe-id="${recipeId}"]`);
                if (recipeCard) {
                    recipeCard.remove();
                }
                
                // 통계 업데이트
                updateStats();
                
                alert('좋아요를 취소했습니다.');
            } else {
                alert(data.error || '좋아요 취소에 실패했습니다.');
            }
        } catch (error) {
            console.error('좋아요 취소 오류:', error);
            alert('네트워크 오류가 발생했습니다.');
        }
    };
});

// 프로필 편집 관련 전역 변수
let selectedProfileImage = null;

// 프로필 사진 모달 열기
window.openProfileModal = function() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
};

// 프로필 사진 모달 닫기
window.closeProfileModal = function() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // 입력 초기화
    document.getElementById('profileImageInput').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('saveProfileBtn').disabled = true;
    selectedProfileImage = null;
};

// 닉네임 모달 열기
window.openNicknameModal = function() {
    const modal = document.getElementById('nicknameModal');
    const currentName = document.getElementById('profileName').textContent.replace('님', '');
    document.getElementById('nicknameInput').value = currentName;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // 입력 필드에 포커스
    setTimeout(() => {
        document.getElementById('nicknameInput').focus();
    }, 100);
};

// 닉네임 모달 닫기
window.closeNicknameModal = function() {
    const modal = document.getElementById('nicknameModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
};

// 프로필 이미지 미리보기
window.previewProfileImage = function(input) {
    const file = input.files[0];
    if (!file) {
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('saveProfileBtn').disabled = true;
        selectedProfileImage = null;
        return;
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        input.value = '';
        return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        input.value = '';
        return;
    }

    selectedProfileImage = file;
    
    // 미리보기 표시
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('saveProfileBtn').disabled = false;
    };
    reader.readAsDataURL(file);
};

// 프로필 이미지 저장
window.saveProfileImage = async function() {
    if (!selectedProfileImage) {
        alert('이미지를 선택해주세요.');
        return;
    }

    const saveBtn = document.getElementById('saveProfileBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    try {
        const formData = new FormData();
        formData.append('profile_image', selectedProfileImage);

        const response = await fetch('/api/update-profile-image', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // 프로필 이미지 업데이트
            updateProfileImage(data.image_url);
            closeProfileModal();
            showToast('프로필 사진이 변경되었습니다.');
        } else {
            alert(data.error || '프로필 사진 변경에 실패했습니다.');
        }
    } catch (error) {
        console.error('프로필 사진 변경 오류:', error);
        alert('네트워크 오류가 발생했습니다.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '저장';
    }
};

// 닉네임 저장
window.saveNickname = async function() {
    const nicknameInput = document.getElementById('nicknameInput');
    const newNickname = nicknameInput.value.trim();

    if (!newNickname) {
        alert('닉네임을 입력해주세요.');
        nicknameInput.focus();
        return;
    }

    if (newNickname.length > 20) {
        alert('닉네임은 20자 이하로 입력해주세요.');
        nicknameInput.focus();
        return;
    }

    try {
        const response = await fetch('/api/update-nickname', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname: newNickname })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // 닉네임 업데이트
            document.getElementById('profileName').textContent = newNickname + '님';
            closeNicknameModal();
            showToast('닉네임이 변경되었습니다.');
        } else {
            alert(data.error || '닉네임 변경에 실패했습니다.');
        }
    } catch (error) {
        console.error('닉네임 변경 오류:', error);
        alert('네트워크 오류가 발생했습니다.');
    }
};

// 프로필 이미지 UI 업데이트
function updateProfileImage(imageUrl) {
    const avatarContainer = document.getElementById('avatarContainer');
    
    // 기존 아바타 제거
    avatarContainer.innerHTML = '';
    
    // 새 이미지 추가
    const img = document.createElement('img');
    img.id = 'profileImage';
    img.src = imageUrl;
    img.alt = '프로필';
    img.className = 'avatar-image';
    avatarContainer.appendChild(img);
}

// 토스트 메시지 표시
function showToast(message) {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;

    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: '#333',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'all 0.3s ease'
    });

    document.body.appendChild(toast);

    // 애니메이션으로 표시
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // 3초 후 자동 제거
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// 모달 백드롭 클릭으로 닫기
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('edit-modal')) {
        if (e.target.id === 'profileModal') {
            closeProfileModal();
        } else if (e.target.id === 'nicknameModal') {
            closeNicknameModal();
        }
    }
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const profileModal = document.getElementById('profileModal');
        const nicknameModal = document.getElementById('nicknameModal');
        
        if (profileModal.classList.contains('show')) {
            closeProfileModal();
        } else if (nicknameModal.classList.contains('show')) {
            closeNicknameModal();
        }
    }
});