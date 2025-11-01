from flask import Blueprint, request, jsonify
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError
from werkzeug.security import generate_password_hash
from datetime import datetime
import os, re

sign_bp = Blueprint("sign", __name__)

# MongoDB 연결
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://rlaalsco8:UEqJNHZE4LRTRyAH@myowncloudmongodb.ls6rso4.mongodb.net/?retryWrites=true&w=majority&appName=MyOwnCloudMongoDB"
)
client = MongoClient(MONGO_URI)
db = client["O2A"]
users = db["users"]

# 이메일 유니크 인덱스
users.create_index([("email", ASCENDING)], unique=True, name="uniq_email")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

@sign_bp.post("/api/sign")
def signup():
    """회원가입 처리"""
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    marketing = bool(data.get("marketing_agree"))

    if not name or not email or not password:
        return jsonify(message="필수 항목을 모두 입력해주세요."), 400
    if not EMAIL_RE.match(email):
        return jsonify(message="이메일 형식이 올바르지 않습니다."), 400
    if len(password) < 8:
        return jsonify(message="비밀번호는 8자 이상이어야 합니다."), 400

    doc = {
        "name": name,
        "email": email,
        "pw_hash": generate_password_hash(password),
        "marketing_agree": marketing,
        "created_at": datetime.utcnow(),
    }

    try:
        users.insert_one(doc)
    except DuplicateKeyError:
        return jsonify(message="이미 가입된 이메일입니다."), 409

    return jsonify(ok=True, redirect="/sign_success"), 201 # 회원가입 성공시 성공페이지 띄우기  
