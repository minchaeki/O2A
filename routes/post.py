# routes/post.py
from flask import Blueprint, request, jsonify, session
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from werkzeug.utils import secure_filename
import os, json, uuid

post_bp = Blueprint("post", __name__)

# --- DB 연결 ---
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://rlaalsco8:UEqJNHZE4LRTRyAH@myowncloudmongodb.ls6rso4.mongodb.net/?retryWrites=true&w=majority&appName=MyOwnCloudMongoDB"
)
client = MongoClient(MONGO_URI)
db = client["O2A"]
posts = db["posts"]
users = db["users"]

# 업로드 폴더 (정적 제공 경로 하위)
UPLOAD_DIR = os.path.join("static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 인덱스
try:
    posts.create_index([("created_at", -1)])
    posts.create_index([("author_id", 1), ("created_at", -1)])
    posts.create_index([("likes", -1)])
except Exception:
    pass


def _to_int(v, default=0, min_value=None):
    try:
        x = int(v)
        if min_value is not None:
            x = max(x, min_value)
        return x
    except Exception:
        return default


def _to_list(v):
    """문자열이면 콤마/줄바꿈 분리, 배열이면 그대로 정규화"""
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    txt = str(v).replace("\r\n", "\n")
    raw = []
    for line in txt.split("\n"):
        raw.extend(x.strip() for x in line.split(","))
    return [x for x in raw if x]


ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

def _save_image(file_storage):
    """단일 이미지 저장 함수"""
    if not file_storage or not file_storage.filename:
        return None
    
    # 원본 파일명에서 확장자만 추출
    original_filename = file_storage.filename
    _, ext = os.path.splitext(original_filename)
    ext = ext.lower()
    
    # 확장자 검사
    if ext not in ALLOWED_EXTS:
        return None
    
    # UUID로 완전히 새로운 파일명 생성
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        file_storage.save(save_path)
        image_url = f"/static/uploads/{unique_filename}"
        return image_url
    except Exception as e:
        print(f"파일 저장 중 오류: {e}")
        return None


@post_bp.post("/api/posts")
def create_post():
    """
    단일 이미지 업로드로 변경된 레시피 작성 API
    """
    # 1) 로그인 확인
    uid = session.get("user_id")
    if not uid:
        return jsonify(ok=False, message="로그인이 필요합니다."), 401

    # 2) 폼/파일 파싱
    form = request.form
    files = request.files

    title = (form.get("title") or "").strip()
    if not title:
        return jsonify(ok=False, message="제목은 필수입니다."), 400

    if len(title) > 30:
        return jsonify(ok=False, message="제목은 30자 이내로 입력해 주세요."), 400

    servings = _to_int(form.get("servings"), default=1, min_value=1)
    cook_time = _to_int(form.get("time"), default=0, min_value=0)
    level = (form.get("level") or "하").strip()
    category = (form.get("category") or "").strip()
    desc = (form.get("desc") or "").strip()

    # JSON 문자열로 넘어오는 필드 복원
    def loads(s, fallback):
        try:
            return json.loads(s) if s is not None else fallback
        except Exception:
            return fallback

    tags = loads(form.get("tags"), [])
    ingredients = loads(form.get("ingredients"), [])
    raw_steps = loads(form.get("steps"), [])

    # steps 정규화
    steps = []
    if isinstance(raw_steps, list):
        for s in raw_steps:
            if isinstance(s, dict):
                text = (s.get("text") or "").strip()
                mm = _to_int(s.get("min"), default=0, min_value=0)
            else:
                text = str(s).strip()
                mm = 0
            if text:
                steps.append({"text": text, "min": mm})

    # 3) 작성자 정보
    try:
        author_oid = ObjectId(uid)
    except Exception:
        session.clear()
        return jsonify(ok=False, message="세션 정보가 올바르지 않습니다."), 401

    user = users.find_one({"_id": author_oid}, {"name": 1})
    author_name = (user or {}).get("name", "")

    # 4) 단일 이미지 처리
    image_url = None
    if "image" in files:
        image_url = _save_image(files["image"])

    # 5) 문서 구성
    doc = {
        "title": title,
        "servings": servings,
        "time_minutes": cook_time,
        "level": level,
        "category": category,
        "tags": tags if isinstance(tags, list) else _to_list(tags),
        "desc": desc,
        "ingredients": ingredients if isinstance(ingredients, list) else _to_list(ingredients),
        "steps": steps,
        "likes": 0,
        "liked_by": [],  # 좋아요한 사용자 ID 배열
        "author_id": author_oid,
        "author_name": author_name,
        "image_url": image_url,  # 단일 이미지
        "visibility": "public",
        "status": "published",
        "created_at": datetime.utcnow(),
        "updated_at": None
    }

    # 6) 저장
    try:
        rid = posts.insert_one(doc).inserted_id
        return jsonify(ok=True, id=str(rid)), 201
    except Exception as e:
        return jsonify(ok=False, message="저장 중 오류가 발생했습니다.", detail=str(e)), 500