// static/js/review.js - 별점 문제 완전 해결 버전
class ReviewSystem {
    constructor() {
        this.currentPostId = null;
        this.myReview = null;
        this.currentContainer = null;
        this.currentRating = 0;
        this.initEventListeners();
    }

    initEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                this.handleStarClick(e.target);
            }
            
            if (e.target.classList.contains('submit-review-btn')) {
                this.submitReview();
            }
            
            if (e.target.classList.contains('delete-review-btn')) {
                const reviewId = e.target.dataset.reviewId;
                this.deleteReview(reviewId);
            }
        });

        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('star') && e.target.closest('.star-rating')) {
                this.handleStarHover(e.target);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('star') && e.target.closest('.star-rating')) {
                this.resetStarDisplay();
            }
        });
    }

    async renderReviewSection(postId, container) {
        this.currentPostId = postId;
        this.currentContainer = container;
        
        try {
            const [reviewsData, myReviewData] = await Promise.all([
                fetch(`/api/review/${postId}`).then(r => r.json()),
                fetch(`/api/my-review/${postId}`).then(r => r.json())
            ]);
            
            this.myReview = myReviewData.my_review;
            
            const reviewHTML = this.generateReviewHTML(reviewsData, myReviewData.my_review);
            container.innerHTML = reviewHTML;
            
            if (this.myReview) {
                this.currentRating = this.myReview.rating;
                setTimeout(() => {
                    this.setStarRating(this.myReview.rating);
                }, 100);
            }
            
        } catch (error) {
            console.error('리뷰 로드 오류:', error);
            container.innerHTML = '<div class="error">리뷰를 불러올 수 없습니다.</div>';
        }
    }

    generateReviewHTML(reviewsData, myReview) {
        const { reviews, stats } = reviewsData;
        
        return `
            <div class="review-section">
                <div class="review-header">
                    <h3>리뷰 (${stats.total_reviews})</h3>
                    <div class="rating-summary">
                        ${stats.avg_rating > 0 ? `
                            <div class="avg-rating">
                                <span class="rating-number">${stats.avg_rating}</span>
                                <div class="stars-display">${this.generateStarsDisplay(stats.avg_rating)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="review-form">
                    <h4>${myReview ? '내 리뷰 수정' : '리뷰 작성하기'}</h4>
                    <div class="star-rating-container">
                        <div class="star-rating">
                            ${[1, 2, 3, 4, 5].map(i => 
                                `<span class="star interactive-star" data-rating="${i}"></span>`
                            ).join('')}
                        </div>
                        <span class="rating-text">별점을 선택해주세요</span>
                    </div>
                    <textarea 
                        id="reviewComment" 
                        placeholder="이 레시피는 어떠셨나요? (선택사항, 500자 이내)"
                        maxlength="500"
                        rows="3"
                    >${myReview ? myReview.comment : ''}</textarea>
                    <div class="form-actions">
                        <button class="submit-review-btn">${myReview ? '수정하기' : '리뷰 등록'}</button>
                        ${myReview ? `<button class="delete-review-btn" data-review-id="${myReview.id}">삭제</button>` : ''}
                    </div>
                </div>

                <div class="reviews-list">
                    ${reviews.length > 0 ? reviews.map(review => `
                        <div class="review-item">
                            <div class="review-header-item">
                                <div class="reviewer-info">
                                    <span class="reviewer-name">${review.user_name}</span>
                                    <div class="review-rating">${this.generateStarsDisplay(review.rating)}</div>
                                </div>
                                <span class="review-date">${review.created_at}</span>
                            </div>
                            ${review.comment ? `<div class="review-comment">${this.escapeHtml(review.comment)}</div>` : ''}
                            ${review.is_updated ? '<div class="review-updated">수정됨</div>' : ''}
                        </div>
                    `).join('') : '<div class="no-reviews">아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!</div>'}
                </div>
            </div>
        `;
    }

    generateStarsDisplay(rating) {
        const fullStars = Math.floor(rating);
        let stars = '';
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += '<span class="star display-star filled"></span>';
            } else {
                stars += '<span class="star display-star empty"></span>';
            }
        }
        
        return stars;
    }

    handleStarClick(starElement) {
        const rating = parseInt(starElement.dataset.rating);
        this.currentRating = rating;
        this.setStarRating(rating);
        this.updateRatingText(rating);
    }

    handleStarHover(starElement) {
        const rating = parseInt(starElement.dataset.rating);
        this.highlightStars(rating);
    }

    setStarRating(rating) {
        const stars = document.querySelectorAll('.star-rating .interactive-star');
        stars.forEach((star, index) => {
            star.classList.remove('selected', 'hover');
            
            if (index < rating) {
                star.classList.add('selected');
            }
        });
        this.currentRating = rating;
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.star-rating .interactive-star');
        stars.forEach((star, index) => {
            star.classList.remove('hover');
            
            if (index < rating) {
                star.classList.add('hover');
            }
        });
    }

    resetStarDisplay() {
        this.setStarRating(this.currentRating);
    }

    updateRatingText(rating) {
        const ratingText = document.querySelector('.rating-text');
        if (ratingText) {
            const texts = ['', '별로예요', '그저그래요', '좋아요', '훌륭해요', '최고예요'];
            ratingText.textContent = texts[rating] || '별점을 선택해주세요';
        }
    }

    async submitReview() {
        if (this.currentRating === 0) {
            alert('별점을 선택해주세요.');
            return;
        }
        
        const comment = document.getElementById('reviewComment').value.trim();
        
        try {
            const response = await fetch('/api/review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    post_id: this.currentPostId,
                    rating: this.currentRating,
                    comment: comment
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                alert(data.message);
                if (this.currentContainer) {
                    await this.renderReviewSection(this.currentPostId, this.currentContainer);
                }
            } else {
                alert(data.error || '리뷰 등록에 실패했습니다.');
            }
            
        } catch (error) {
            console.error('리뷰 등록 오류:', error);
            alert('네트워크 오류가 발생했습니다.');
        }
    }

    async deleteReview(reviewId) {
        if (!confirm('리뷰를 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/review/${reviewId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                alert(data.message);
                if (this.currentContainer) {
                    await this.renderReviewSection(this.currentPostId, this.currentContainer);
                }
            } else {
                alert(data.error || '리뷰 삭제에 실패했습니다.');
            }
            
        } catch (error) {
            console.error('리뷰 삭제 오류:', error);
            alert('네트워크 오류가 발생했습니다.');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.reviewSystem = new ReviewSystem();