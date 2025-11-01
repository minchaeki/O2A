# routes/search.py - 검색 기능 백엔드 API

from flask import Blueprint, request, jsonify
from pymongo import MongoClient
import re
from bson import ObjectId
from datetime import datetime

# 검색 기능을 위한 Blueprint 생성
search_bp = Blueprint('search', __name__)

# MongoDB Atlas 클라우드 데이터베이스 연결
try:
    # 연결 문자열 (실제 프로덕션에서는 환경변수로 관리해야 함)
    MONGO_URI = "mongodb+srv://rlaalsco8:UEqJNHZE4LRTRyAH@myowncloudmongodb.ls6rso4.mongodb.net/?retryWrites=true&w=majority&appName=MyOwnCloudMongoDB"
    client = MongoClient(MONGO_URI)
    db = client["O2A"]  # 데이터베이스 이름
    posts_collection = db["posts"]  # 레시피 게시글 컬렉션
    
    # 연결 테스트 (ping 명령어로 서버 응답 확인)
    client.admin.command('ping')
    print("MongoDB Atlas 연결 성공")
except Exception as e:
    print(f"MongoDB Atlas 연결 실패: {e}")
    # 연결 실패 시 None으로 설정
    client = None
    db = None
    posts_collection = None

@search_bp.route('/api/search', methods=['GET'])
def search_posts():
    """
    레시피 검색 API
    GET /api/search?q=검색어&sort=정렬방식
    
    쿼리 파라미터:
    - q: 검색어 (필수)
    - sort: 정렬 방식 (likes=좋아요순, recent=최신순, time=조리시간순)
    
    응답:
    - success: 성공 여부
    - query: 검색어
    - count: 결과 개수
    - results: 검색 결과 배열
    """
    try:
        # MongoDB 연결 상태 확인
        if posts_collection is None:
            return jsonify({'error': '데이터베이스 연결 오류'}), 500
            
        # URL 쿼리 파라미터 추출
        query = request.args.get('q', '').strip()  # 검색어
        sort_by = request.args.get('sort', 'likes')  # 정렬 방식 (기본값: 좋아요순)
        
        print(f"검색 요청: query='{query}', sort='{sort_by}'")  # 디버깅용 로그
        
        # 검색어 유효성 검사
        if not query:
            return jsonify({'error': '검색어를 입력해주세요.'}), 400
        
        # MongoDB 검색 조건 설정
        search_filter = {
            # 제목에서 대소문자 구분 없이 부분 일치 검색
            'title': {'$regex': query, '$options': 'i'},  # i = case insensitive
            'status': 'published',    # 발행된 게시글만
            'visibility': 'public'    # 공개 게시글만
        }
        
        print(f"검색 필터: {search_filter}")  # 디버깅용
        
        # 정렬 조건 설정
        sort_options = {
            # 좋아요 많은 순 -> 최신순 (2차 정렬)
            'likes': [('likes', -1), ('created_at', -1)],
            # 최신순
            'recent': [('created_at', -1)],
            # 조리시간 짧은 순 -> 최신순 (2차 정렬)
            'time': [('time_minutes', 1), ('created_at', -1)]
        }
        
        # 요청된 정렬 방식 가져오기 (기본값: 좋아요순)
        sort_criteria = sort_options.get(sort_by, sort_options['likes'])
        
        # 데이터베이스에서 검색 실행
        posts = list(posts_collection.find(search_filter)
                    .sort(sort_criteria)  # 정렬 적용
                    .limit(50))           # 최대 50개 결과
        
        print(f"검색 결과 개수: {len(posts)}")  # 디버깅용
        
        # 검색 결과를 클라이언트용 형태로 변환
        results = []
        for post in posts:
            try:
                # 생성일 처리 (datetime 객체를 문자열로 변환)
                if isinstance(post.get('created_at'), str):
                    # 이미 문자열인 경우 날짜 부분만 추출
                    created_date = post['created_at'][:10]  # YYYY-MM-DD
                else:
                    # datetime 객체인 경우 포맷팅
                    created_date = post['created_at'].strftime('%Y-%m-%d')
                
                # 클라이언트에 전송할 데이터 구성
                results.append({
                    'id': str(post['_id']),                    # MongoDB ObjectId를 문자열로
                    'title': post.get('title', '제목 없음'),
                    'author_name': post.get('author_name', '익명'),
                    'created_at': created_date,
                    'likes': post.get('likes', 0),
                    'time_minutes': post.get('time_minutes', 0),
                    'level': post.get('level', ''),
                    'category': post.get('category', ''),
                    'tags': post.get('tags', []),
                    'desc': post.get('desc', ''),
                    'servings': post.get('servings', 1)
                })
            except Exception as post_error:
                # 개별 게시글 처리 중 오류 발생 시 해당 게시글만 건너뛰기
                print(f"게시글 처리 오류: {post_error}")
                continue
        
        # 성공 응답 반환
        return jsonify({
            'success': True,
            'query': query,
            'count': len(results),
            'results': results
        })
        
    except Exception as e:
        # 전체적인 오류 처리
        print(f"검색 API 오류: {e}")  # 디버깅용
        return jsonify({'error': f'검색 중 오류가 발생했습니다: {str(e)}'}), 500

@search_bp.route('/api/top10', methods=['GET'])
def get_top10():
    """
    TOP 10 인기 레시피 조회 API
    GET /api/top10
    
    응답:
    - success: 성공 여부
    - results: TOP 10 레시피 배열 (좋아요 많은 순)
    """
    try:
        # MongoDB 연결 상태 확인
        if posts_collection is None:
            return jsonify({'error': '데이터베이스 연결 오류'}), 500
            
        # TOP 10 인기 게시글 조회
        top_posts = list(posts_collection.find(
            # 발행된 공개 게시글만 조회
            {'status': 'published', 'visibility': 'public'}
        ).sort([
            ('likes', -1),      # 1차: 좋아요 많은 순
            ('created_at', -1)  # 2차: 최신순 (좋아요 수가 같을 경우)
        ]).limit(10))  # 상위 10개만
        
        # 클라이언트용 데이터 변환 (간단한 정보만)
        results = []
        for post in top_posts:
            results.append({
                'id': str(post['_id']),
                'title': post.get('title', '제목 없음'),
                'likes': post.get('likes', 0)
            })
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        print(f"TOP 10 API 오류: {e}")  # 디버깅용
        return jsonify({'error': f'TOP 10 조회 중 오류가 발생했습니다: {str(e)}'}), 500