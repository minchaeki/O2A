from flask import Flask, render_template, session, redirect, url_for
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv()
import os
os.environ['TZ'] = 'Asia/Seoul'
from routes.sign import sign_bp  
from routes.login import login_bp
from routes.post import post_bp
from routes.search import search_bp
from routes.post_detail import post_detail_bp  
from routes.mypage import mypage_bp
from routes.review import review_bp  # 리뷰 시스템 추가
from routes.chatbot import chatbot_bp #chatbot 시스템 추가
from routes.chatbot import clear_user_chat_history

app = Flask(__name__)
app.secret_key = "dlehddnrWKdWKdaos"    # 비밀키 입니다 #
app.permanent_session_lifetime = timedelta(days=1) # 로그인 유지 기간 ( 하루 )  

# 블루프린트 등록
app.register_blueprint(sign_bp)
app.register_blueprint(login_bp)
app.register_blueprint(post_bp)
app.register_blueprint(search_bp)
app.register_blueprint(post_detail_bp)
app.register_blueprint(mypage_bp)
app.register_blueprint(review_bp)  # 리뷰 시스템 추가
app.register_blueprint(chatbot_bp)

@app.route("/")
def home():
    return render_template("main.html", user_name=session.get("user_name"))

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/sign")
def sign_page():
    return render_template("sign.html")

@app.route("/sign_success")
def sign_success_page():
    return render_template("sign_success.html")

@app.route("/logout")
def logout():
    user_id = session.get("user_id")
    
    # 세션 먼저 클리어 (보안상 중요)
    session.clear()
    
    # 채팅 기록 삭제 (실패해도 로그아웃은 완료된 상태)
    if user_id:
        try:
            from routes.chatbot import clear_user_chat_history
            clear_user_chat_history(user_id)
        except Exception as e:
            # 로깅만 하고 사용자에게는 영향 없음
            print(f"채팅 기록 삭제 중 오류 발생: {e}")
    
    return redirect("/")

@app.route("/search_result")
def search_result_page():
    return render_template("search_result.html")

@app.route("/post")
def recipe_writing_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("post.html")

# 정적 파일 서빙을 위한 업로드 폴더 설정
import os
UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004, debug=False, threaded=True)