# login.py
from flask import Blueprint, request, jsonify, session
from pymongo import MongoClient
from werkzeug.security import check_password_hash
import os

login_bp = Blueprint("login", __name__)

# DB 연결
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://rlaalsco8:UEqJNHZE4LRTRyAH@myowncloudmongodb.ls6rso4.mongodb.net/?retryWrites=true&w=majority&appName=MyOwnCloudMongoDB"
)
client = MongoClient(MONGO_URI)
db = client["O2A"]
users = db["users"]

@login_bp.post("/api/login")   
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # 사용자 찾기
    user = users.find_one({"email": email})
    if not user:
        return jsonify(ok=False, message="이메일 또는 비밀번호가 잘못되었습니다."), 401

    # 비번 검증
    if not check_password_hash(user["pw_hash"], password):
        return jsonify(ok=False, message="이메일 또는 비밀번호가 잘못되었습니다."), 401
    
    # 로그인 성공 -> 세션 저장
    session.permanent = True
    session["user_id"] = str(user["_id"]) # 몽고 ObjectId를 문자열로 저장
    session["user_name"] = user["name"]

    # 로그인 성공
    return jsonify(ok=True), 200
