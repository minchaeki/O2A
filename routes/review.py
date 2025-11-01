# routes/review.py
from flask import Blueprint, request, jsonify, session
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os

review_bp = Blueprint('review', __name__)

# MongoDB 연결
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://rlaalsco8:UEqJNHZE4LRTRyAH@myowncloudmongodb.ls6rso4.mongodb.net/?retryWrites=true&w=majority&appName=MyOwnCloudMongoDB")
client = MongoClient(MONGO_URI)
db = client["O2A"]
posts = db["posts"]
reviews = db["reviews"]
users = db["users"]

# 인덱스 생성
try:
    reviews.create_index([("post_id", 1), ("user_id", 1)], unique=True)
    reviews.create_index([("post_id", 1)])
    reviews.create_index([("created_at", -1)])
except:
    pass

@review_bp.route('/api/review', methods=['POST'])
def create_review():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다'}), 401
    
    data = request.get_json()
    post_id = data.get('post_id')
    rating = data.get('rating')
    comment = data.get('comment', '').strip()
    
    if not post_id or not ObjectId.is_valid(post_id):
        return jsonify({'error': '잘못된 게시물 ID입니다'}), 400
    
    if not rating or rating < 1 or rating > 5:
        return jsonify({'error': '별점은 1-5점 사이여야 합니다'}), 400
    
    if len(comment) > 500:
        return jsonify({'error': '리뷰는 500자 이내로 작성해주세요'}), 400
    
    try:
        post_oid = ObjectId(post_id)
        user_oid = ObjectId(user_id)
        
        post = posts.find_one({'_id': post_oid})
        if not post:
            return jsonify({'error': '존재하지 않는 게시물입니다'}), 404
        
        if post.get('author_id') == user_oid:
            return jsonify({'error': '자신의 레시피에는 리뷰를 작성할 수 없습니다'}), 403
        
        # 사용자 정보에서 닉네임 또는 이름 가져오기
        user = users.find_one({'_id': user_oid})
        user_name = user.get('nickname') or user.get('name', '익명') if user else '익명'
        
        existing_review = reviews.find_one({'post_id': post_oid, 'user_id': user_oid})
        
        review_doc = {
            'post_id': post_oid,
            'user_id': user_oid,
            'user_name': user_name,
            'rating': int(rating),
            'comment': comment,
            'updated_at': datetime.utcnow()
        }
        
        if existing_review:
            reviews.update_one({'_id': existing_review['_id']}, {'$set': review_doc})
            action = 'updated'
        else:
            review_doc['created_at'] = datetime.utcnow()
            reviews.insert_one(review_doc)
            action = 'created'
        
        update_post_rating(post_oid)
        
        return jsonify({
            'success': True,
            'message': f'리뷰가 {"수정" if action == "updated" else "등록"}되었습니다'
        })
        
    except Exception as e:
        print(f"리뷰 작성 오류: {e}")
        return jsonify({'error': '서버 오류가 발생했습니다'}), 500

@review_bp.route('/api/review/<post_id>', methods=['GET'])
def get_reviews(post_id):
    if not ObjectId.is_valid(post_id):
        return jsonify({'error': '잘못된 게시물 ID입니다'}), 400
    
    try:
        post_oid = ObjectId(post_id)
        
        review_list = list(reviews.find({'post_id': post_oid}).sort('created_at', -1))
        
        total_reviews = len(review_list)
        avg_rating = 0
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        
        if total_reviews > 0:
            total_rating = sum(r['rating'] for r in review_list)
            avg_rating = round(total_rating / total_reviews, 1)
            
            for review in review_list:
                rating_distribution[review['rating']] += 1
        
        serialized_reviews = []
        for review in review_list:
            serialized_reviews.append({
                'id': str(review['_id']),
                'user_name': review.get('user_name', '익명'),
                'rating': review['rating'],
                'comment': review.get('comment', ''),
                'created_at': review['created_at'].strftime('%Y-%m-%d %H:%M') if review.get('created_at') else '',
                'updated_at': review['updated_at'].strftime('%Y-%m-%d %H:%M') if review.get('updated_at') else '',
                'is_updated': review.get('updated_at') != review.get('created_at')
            })
        
        return jsonify({
            'success': True,
            'reviews': serialized_reviews,
            'stats': {
                'total_reviews': total_reviews,
                'avg_rating': avg_rating,
                'rating_distribution': rating_distribution
            }
        })
        
    except Exception as e:
        print(f"리뷰 조회 오류: {e}")
        return jsonify({'error': '서버 오류가 발생했습니다'}), 500

@review_bp.route('/api/review/<review_id>', methods=['DELETE'])
def delete_review(review_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다'}), 401
    
    if not ObjectId.is_valid(review_id):
        return jsonify({'error': '잘못된 리뷰 ID입니다'}), 400
    
    try:
        review_oid = ObjectId(review_id)
        user_oid = ObjectId(user_id)
        
        review = reviews.find_one({'_id': review_oid, 'user_id': user_oid})
        if not review:
            return jsonify({'error': '리뷰를 찾을 수 없거나 삭제 권한이 없습니다'}), 404
        
        post_id = review['post_id']
        reviews.delete_one({'_id': review_oid})
        update_post_rating(post_id)
        
        return jsonify({'success': True, 'message': '리뷰가 삭제되었습니다'})
        
    except Exception as e:
        print(f"리뷰 삭제 오류: {e}")
        return jsonify({'error': '서버 오류가 발생했습니다'}), 500

@review_bp.route('/api/my-review/<post_id>', methods=['GET'])
def get_my_review(post_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'my_review': None})
    
    if not ObjectId.is_valid(post_id):
        return jsonify({'error': '잘못된 게시물 ID입니다'}), 400
    
    try:
        post_oid = ObjectId(post_id)
        user_oid = ObjectId(user_id)
        
        review = reviews.find_one({'post_id': post_oid, 'user_id': user_oid})
        
        if review:
            return jsonify({
                'my_review': {
                    'id': str(review['_id']),
                    'rating': review['rating'],
                    'comment': review.get('comment', ''),
                    'created_at': review['created_at'].strftime('%Y-%m-%d %H:%M') if review.get('created_at') else ''
                }
            })
        else:
            return jsonify({'my_review': None})
            
    except Exception as e:
        print(f"내 리뷰 조회 오류: {e}")
        return jsonify({'error': '서버 오류가 발생했습니다'}), 500

def update_post_rating(post_id):
    try:
        review_list = list(reviews.find({'post_id': post_id}))
        
        if review_list:
            total_rating = sum(r['rating'] for r in review_list)
            avg_rating = round(total_rating / len(review_list), 1)
            review_count = len(review_list)
        else:
            avg_rating = 0
            review_count = 0
        
        posts.update_one(
            {'_id': post_id},
            {'$set': {'avg_rating': avg_rating, 'review_count': review_count}}
        )
        
    except Exception as e:
        print(f"게시물 평점 업데이트 오류: {e}")

@review_bp.route('/api/update-review-usernames/<user_id>', methods=['POST'])
def update_review_usernames(user_id):
    """특정 사용자의 모든 리뷰에서 사용자명 업데이트 (내부 API)"""
    try:
        data = request.get_json()
        new_username = data.get('new_username')
        
        if not new_username:
            return jsonify({'error': '새 사용자명이 필요합니다'}), 400
        
        if not ObjectId.is_valid(user_id):
            return jsonify({'error': '잘못된 사용자 ID입니다'}), 400
        
        user_oid = ObjectId(user_id)
        
        # 해당 사용자가 작성한 모든 리뷰의 user_name 업데이트
        result = reviews.update_many(
            {'user_id': user_oid},
            {'$set': {'user_name': new_username}}
        )
        
        return jsonify({
            'success': True,
            'message': f'{result.modified_count}개의 리뷰가 업데이트되었습니다',
            'modified_count': result.modified_count
        })
        
    except Exception as e:
        print(f"리뷰 사용자명 업데이트 오류: {e}")
        return jsonify({'error': '서버 오류가 발생했습니다'}), 500