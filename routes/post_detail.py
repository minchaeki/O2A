# post_detail.py - 레시피 상세보기 API 백엔드 (조회수 제거)

from flask import Blueprint, jsonify, request, session
from bson import ObjectId
from bson.errors import InvalidId
import logging
from datetime import datetime
from pymongo import MongoClient
import os

# Blueprint 생성
post_detail_bp = Blueprint('post_detail', __name__)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB 연결
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://rlaalsco8:UEqJNHZE4LRTRyAH@myowncloudmongodb.ls6rso4.mongodb.net/?retryWrites=true&w=majority&appName=MyOwnCloudMongoDB"
)
client = MongoClient(MONGO_URI)
db = client["O2A"]

def get_db():
    """데이터베이스 연결 가져오기"""
    return db

@post_detail_bp.route('/api/post/<post_id>', methods=['GET'])
def get_post_detail(post_id):
    """
    특정 게시물의 상세 정보를 반환하는 API (조회수 기능 제거)
    """
    try:
        # ObjectId 유효성 검사
        if not ObjectId.is_valid(post_id):
            return jsonify({
                'error': '잘못된 게시물 ID 형식입니다',
                'message': 'Invalid post ID format'
            }), 400

        # 데이터베이스에서 게시물 조회
        db_conn = get_db()
        post = db_conn.posts.find_one({'_id': ObjectId(post_id)})
        
        if not post:
            return jsonify({
                'error': '게시물을 찾을 수 없습니다',
                'message': 'Post not found'
            }), 404

        # 게시 상태 체크
        if post.get('status') != 'published':
            return jsonify({
                'error': '게시되지 않은 레시피입니다',
                'message': 'Post is not published'
            }), 404

        # 현재 사용자가 좋아요를 눌렀는지 확인
        user_id = session.get('user_id')
        user_liked = False
        if user_id:
            liked_by = post.get('liked_by', [])
            user_liked = str(user_id) in [str(uid) for uid in liked_by]

        # MongoDB ObjectId를 문자열로 변환
        post_data = serialize_post(post)
        post_data['user_liked'] = user_liked  # 사용자 좋아요 상태 추가
        
        logger.info(f"게시물 조회 성공: {post_id}")
        return jsonify(post_data), 200

    except InvalidId:
        return jsonify({
            'error': '잘못된 게시물 ID입니다',
            'message': 'Invalid ObjectId'
        }), 400
    except Exception as e:
        logger.error(f"게시물 조회 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 오류가 발생했습니다',
            'message': 'Internal server error'
        }), 500

@post_detail_bp.route('/api/post/<post_id>/like', methods=['POST'])
def toggle_like_post(post_id):
    """
    게시물 좋아요 토글 API (한 사용자당 한 번만)
    """
    try:
        # 로그인 확인
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'error': '로그인이 필요합니다',
                'message': 'Login required'
            }), 401

        # ObjectId 유효성 검사
        if not ObjectId.is_valid(post_id):
            return jsonify({
                'error': '잘못된 게시물 ID 형식입니다'
            }), 400

        db_conn = get_db()
        
        # 게시물 존재 여부 확인
        post = db_conn.posts.find_one({'_id': ObjectId(post_id)})
        if not post:
            return jsonify({
                'error': '게시물을 찾을 수 없습니다'
            }), 404

        # 현재 좋아요 상태 확인
        liked_by = post.get('liked_by', [])
        user_liked = str(user_id) in [str(uid) for uid in liked_by]
        
        if user_liked:
            # 좋아요 취소
            result = db_conn.posts.update_one(
                {'_id': ObjectId(post_id)},
                {
                    '$pull': {'liked_by': ObjectId(user_id)},
                    '$inc': {'likes': -1}
                }
            )
            action = '좋아요를 취소했습니다'
            new_liked_status = False
        else:
            # 좋아요 추가
            result = db_conn.posts.update_one(
                {'_id': ObjectId(post_id)},
                {
                    '$addToSet': {'liked_by': ObjectId(user_id)},
                    '$inc': {'likes': 1}
                }
            )
            action = '좋아요를 눌렀습니다'
            new_liked_status = True

        if result.modified_count > 0:
            # 업데이트된 좋아요 수 조회
            updated_post = db_conn.posts.find_one({'_id': ObjectId(post_id)})
            new_likes = max(0, updated_post.get('likes', 0))  # 음수 방지
            
            logger.info(f"좋아요 토글: {post_id}, 사용자: {user_id}, 상태: {new_liked_status}")
            return jsonify({
                'success': True,
                'likes': new_likes,
                'user_liked': new_liked_status,
                'message': action
            }), 200
        else:
            return jsonify({
                'error': '좋아요 처리에 실패했습니다'
            }), 500

    except Exception as e:
        logger.error(f"좋아요 처리 중 오류 발생: {e}")
        return jsonify({
            'error': '서버 오류가 발생했습니다'
        }), 500

def serialize_post(post):
    """
    MongoDB 문서를 JSON 직렬화 가능한 형태로 변환
    """
    if not post:
        return None
    
    # ObjectId를 문자열로 변환
    serialized = {
        '_id': str(post['_id']),
        'title': post.get('title', ''),
        'desc': post.get('desc', ''),
        'servings': post.get('servings'),
        'time_minutes': post.get('time_minutes'),
        'level': post.get('level', ''),
        'category': post.get('category', ''),
        'tags': post.get('tags', []),
        'ingredients': post.get('ingredients', []),
        'steps': post.get('steps', []),
        'likes': max(0, post.get('likes', 0)),  # 음수 방지
        'author_name': post.get('author_name', '익명'),
        'image_url': post.get('image_url'),
        'visibility': post.get('visibility', 'public'),
        'status': post.get('status', 'published'),
        'created_at': post.get('created_at'),
        'updated_at': post.get('updated_at')
    }
    
    # author_id가 ObjectId인 경우 문자열로 변환
    if 'author_id' in post and post['author_id']:
        serialized['author_id'] = str(post['author_id'])
    
    return serialized

# 에러 핸들러
@post_detail_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': '요청한 리소스를 찾을 수 없습니다',
        'message': 'Resource not found'
    }), 404

@post_detail_bp.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'error': '서버 내부 오류가 발생했습니다',
        'message': 'Internal server error'
    }), 500