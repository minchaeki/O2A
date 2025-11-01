# routes/mypage.py
from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid

mypage_bp = Blueprint("mypage", __name__)

# DB 연결
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://rlaalsco8:UEqJNHZE4LRTRyAH@myowncloudmongodb.ls6rso4.mongodb.net/?retryWrites=true&w=majority&appName=MyOwnCloudMongoDB"
)
client = MongoClient(MONGO_URI)
db = client["O2A"]
users = db["users"]
posts = db["posts"]

# 업로드 폴더 설정
UPLOAD_DIR = os.path.join("static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 허용된 이미지 확장자
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

def _save_profile_image(file_storage):
    """프로필 이미지 저장 함수"""
    if not file_storage or not file_storage.filename:
        return None
    
    # 원본 파일명에서 확장자만 추출
    original_filename = file_storage.filename
    _, ext = os.path.splitext(original_filename)
    ext = ext.lower()
    
    # 확장자 검사
    if ext not in ALLOWED_EXTENSIONS:
        return None
    
    # UUID로 완전히 새로운 파일명 생성
    unique_filename = f"profile_{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        file_storage.save(save_path)
        image_url = f"/static/uploads/{unique_filename}"
        return image_url
    except Exception as e:
        print(f"파일 저장 중 오류: {e}")
        return None

@mypage_bp.route("/mypage")
def mypage():
    """마이페이지 메인"""
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login.login_page"))
    
    try:
        # 사용자 정보 조회
        user = users.find_one({"_id": ObjectId(user_id)})
        if not user:
            session.clear()
            return redirect(url_for("login.login_page"))
        
        # 사용자가 작성한 레시피 개수
        my_recipes_count = posts.count_documents({"author_id": ObjectId(user_id)})
        
        # 사용자가 좋아요한 레시피 개수
        liked_recipes_count = posts.count_documents({"liked_by": ObjectId(user_id)})
        
        return render_template("mypage.html", 
                             user=user, 
                             my_recipes_count=my_recipes_count,
                             liked_recipes_count=liked_recipes_count)
    except Exception as e:
        print(f"마이페이지 오류: {e}")
        return redirect("/")

@mypage_bp.route("/api/my-recipes")
def get_my_recipes():
    """내가 작성한 레시피 목록 API"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "로그인이 필요합니다"}), 401
    
    try:
        # 내가 작성한 레시피들 조회
        my_posts = list(posts.find(
            {"author_id": ObjectId(user_id)},
            {"title": 1, "likes": 1, "created_at": 1, "category": 1, "image_url": 1}
        ).sort("created_at", -1).limit(20))
        
        # ObjectId를 문자열로 변환
        for post in my_posts:
            post["_id"] = str(post["_id"])
            if post.get("created_at"):
                post["created_at"] = post["created_at"].strftime("%Y-%m-%d")
        
        return jsonify({"success": True, "recipes": my_posts})
    except Exception as e:
        print(f"내 레시피 조회 오류: {e}")
        return jsonify({"error": "데이터를 불러올 수 없습니다"}), 500

@mypage_bp.route("/api/liked-recipes")
def get_liked_recipes():
    """내가 좋아요한 레시피 목록 API"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "로그인이 필요합니다"}), 401
    
    try:
        # 내가 좋아요한 레시피들 조회
        liked_posts = list(posts.find(
            {"liked_by": ObjectId(user_id)},
            {"title": 1, "likes": 1, "author_name": 1, "category": 1, "image_url": 1}
        ).sort("likes", -1).limit(20))
        
        # ObjectId를 문자열로 변환
        for post in liked_posts:
            post["_id"] = str(post["_id"])
        
        return jsonify({"success": True, "recipes": liked_posts})
    except Exception as e:
        print(f"좋아요 레시피 조회 오류: {e}")
        return jsonify({"error": "데이터를 불러올 수 없습니다"}), 500

@mypage_bp.route("/api/delete-recipe/<recipe_id>", methods=["DELETE"])
def delete_recipe(recipe_id):
    """내가 작성한 레시피 삭제 API"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "로그인이 필요합니다"}), 401
    
    try:
        # ObjectId 유효성 검사
        if not ObjectId.is_valid(recipe_id):
            return jsonify({"error": "잘못된 레시피 ID입니다"}), 400
        
        # 레시피 존재 여부 및 작성자 확인
        recipe = posts.find_one({
            "_id": ObjectId(recipe_id),
            "author_id": ObjectId(user_id)
        })
        
        if not recipe:
            return jsonify({"error": "레시피를 찾을 수 없거나 삭제 권한이 없습니다"}), 404
        
        # 레시피 삭제
        result = posts.delete_one({
            "_id": ObjectId(recipe_id),
            "author_id": ObjectId(user_id)
        })
        
        if result.deleted_count > 0:
            return jsonify({"success": True, "message": "레시피가 삭제되었습니다"})
        else:
            return jsonify({"error": "레시피 삭제에 실패했습니다"}), 500
            
    except Exception as e:
        print(f"레시피 삭제 오류: {e}")
        return jsonify({"error": "서버 오류가 발생했습니다"}), 500

@mypage_bp.route("/api/unlike-recipe/<recipe_id>", methods=["POST"])
def unlike_recipe(recipe_id):
    """좋아요 취소 API"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "로그인이 필요합니다"}), 401
    
    try:
        # ObjectId 유효성 검사
        if not ObjectId.is_valid(recipe_id):
            return jsonify({"error": "잘못된 레시피 ID입니다"}), 400
        
        # 좋아요 취소
        result = posts.update_one(
            {"_id": ObjectId(recipe_id)},
            {
                "$pull": {"liked_by": ObjectId(user_id)},
                "$inc": {"likes": -1}
            }
        )
        
        if result.modified_count > 0:
            return jsonify({"success": True, "message": "좋아요를 취소했습니다"})
        else:
            return jsonify({"error": "좋아요 취소에 실패했습니다"}), 500
            
    except Exception as e:
        print(f"좋아요 취소 오류: {e}")
        return jsonify({"error": "서버 오류가 발생했습니다"}), 500

@mypage_bp.route("/api/update-profile-image", methods=["POST"])
def update_profile_image():
    """프로필 사진 업로드 API"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "로그인이 필요합니다"}), 401
    
    try:
        # 파일 검증
        if 'profile_image' not in request.files:
            return jsonify({"error": "이미지 파일이 없습니다"}), 400
        
        file = request.files['profile_image']
        if file.filename == '':
            return jsonify({"error": "파일이 선택되지 않았습니다"}), 400
        
        # 파일 크기 검증 (5MB)
        if len(file.read()) > 5 * 1024 * 1024:
            return jsonify({"error": "파일 크기는 5MB 이하여야 합니다"}), 400
        
        # 파일 포인터를 처음으로 되돌리기
        file.seek(0)
        
        # 이미지 저장
        image_url = _save_profile_image(file)
        if not image_url:
            return jsonify({"error": "지원하지 않는 파일 형식입니다"}), 400
        
        # 사용자 정보 업데이트
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "profile_image_url": image_url,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            return jsonify({
                "success": True, 
                "message": "프로필 사진이 변경되었습니다",
                "image_url": image_url
            })
        else:
            return jsonify({"error": "프로필 사진 변경에 실패했습니다"}), 500
            
    except Exception as e:
        print(f"프로필 사진 업데이트 오류: {e}")
        return jsonify({"error": "서버 오류가 발생했습니다"}), 500

@mypage_bp.route("/api/update-nickname", methods=["POST"])
def update_nickname():
    """닉네임 변경 API"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "로그인이 필요합니다"}), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "잘못된 요청 형식입니다"}), 400
        
        new_nickname = data.get("nickname", "").strip()
        
        # 닉네임 검증
        if not new_nickname:
            return jsonify({"error": "닉네임을 입력해주세요"}), 400
        
        if len(new_nickname) > 20:
            return jsonify({"error": "닉네임은 20자 이하로 입력해주세요"}), 400
        
        # 닉네임 중복 검사 (같은 사용자 제외)
        existing_user = users.find_one({
            "nickname": new_nickname,
            "_id": {"$ne": ObjectId(user_id)}
        })
        
        if existing_user:
            return jsonify({"error": "이미 사용 중인 닉네임입니다"}), 409
        
        # 사용자 정보 업데이트
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "nickname": new_nickname,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            # 세션의 user_name도 업데이트 (헤더에 표시되는 이름)
            session["user_name"] = new_nickname
            
            # 해당 사용자가 작성한 모든 게시물의 author_name도 업데이트
            posts.update_many(
                {"author_id": ObjectId(user_id)},
                {"$set": {"author_name": new_nickname}}
            )
            reviews = db["reviews"]
            reviews.update_many(
                {"user_id": ObjectId(user_id)},
                {"$set": {"user_name": new_nickname}}
            )
            
            return jsonify({
                "success": True, 
                "message": "닉네임이 변경되었습니다",
                "nickname": new_nickname
            })
        else:
            return jsonify({"error": "닉네임 변경에 실패했습니다"}), 500
            
    except Exception as e:
        print(f"닉네임 업데이트 오류: {e}")
        return jsonify({"error": "서버 오류가 발생했습니다"}), 500