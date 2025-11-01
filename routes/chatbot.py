# routes/chatbot.py - 완성된 버전
from flask import Blueprint, request, jsonify, session
from openai import OpenAI
import os
import logging
from datetime import datetime
from pymongo import MongoClient

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

chatbot_bp = Blueprint('chatbot', __name__)

# MongoDB 연결
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://rlaalsco8:UEqJNHZE4LRTRyAH@myowncloudmongodb.ls6rso4.mongodb.net/?retryWrites=true&w=majority&appName=MyOwnCloudMongoDB")
client_mongo = MongoClient(MONGO_URI)
db = client_mongo["O2A"]
chat_sessions = db["chat_sessions"]

# OpenAI 클라이언트 초기화
try:
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        logger.error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
        client = None
    else:
        client = OpenAI(api_key=api_key)
        logger.info("OpenAI 클라이언트 초기화 성공")
except Exception as e:
    logger.error(f"OpenAI 클라이언트 초기화 실패: {e}")
    client = None

@chatbot_bp.route('/api/chatbot', methods=['POST'])
def chat_with_bot():
    if not client:
        return jsonify({'error': 'OpenAI API가 설정되지 않았습니다.'}), 500
    
    # 로그인 체크
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    try:
        # 요청 데이터 검증
        data = request.get_json()
        if not data:
            return jsonify({'error': '잘못된 요청 형식입니다.'}), 400
            
        user_message = data.get('message', '').strip()
        
        # 입력 검증
        if not user_message:
            return jsonify({'error': '메시지가 비어있습니다.'}), 400
            
        if len(user_message) > 500:
            return jsonify({'error': '메시지가 너무 깁니다. (최대 500자)'}), 400
        
        logger.info(f"사용자 메시지: {user_message}")
        
        # 기존 채팅 기록 가져오기
        chat_history = get_chat_history(user_id)
        
        # 사용자 메시지 저장
        save_message(user_id, 'user', user_message)
        
        # OpenAI API 호출 (대화 히스토리 포함)
        messages = build_conversation_context(chat_history, user_message)
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=300,
            temperature=0.7
        )
        
        bot_response = response.choices[0].message.content.strip()
        
        # 봇 응답 저장
        save_message(user_id, 'bot', bot_response)
        
        # 성공 로그
        logger.info(f"챗봇 응답 성공 - 사용자: {user_id}")
        
        return jsonify({
            'success': True,
            'response': bot_response
        })
        
    except Exception as e:
        error_msg = str(e).lower()
        logger.error(f"챗봇 API 오류: {e}")
        
        # 구체적인 오류 처리
        if 'rate limit' in error_msg or 'quota' in error_msg:
            logger.warning("API 사용량 제한 도달")
            return jsonify({'error': 'API 사용량 제한에 도달했습니다. 잠시 후 다시 시도해주세요.'}), 429
            
        elif 'invalid request' in error_msg:
            logger.error(f"잘못된 요청: {e}")
            return jsonify({'error': '잘못된 요청입니다.'}), 400
            
        elif 'authentication' in error_msg or 'api key' in error_msg:
            logger.error("API 인증 실패")
            return jsonify({'error': 'API 인증에 실패했습니다.'}), 401
            
        elif 'timeout' in error_msg:
            logger.error("API 요청 타임아웃")
            return jsonify({'error': '요청 시간이 초과되었습니다. 다시 시도해주세요.'}), 408
            
        else:
            logger.error(f"챗봇 API 오류: {e}")
            return jsonify({'error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}), 500

@chatbot_bp.route('/api/chatbot/history', methods=['GET'])
def get_chat_history_api():
    """채팅 기록 조회 API"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    try:
        history = get_chat_history(user_id)
        return jsonify({
            'success': True,
            'messages': history
        })
    except Exception as e:
        logger.error(f"채팅 기록 조회 오류: {e}")
        return jsonify({'error': '채팅 기록을 불러올 수 없습니다.'}), 500

@chatbot_bp.route('/api/chatbot/clear', methods=['POST'])
def clear_chat_history():
    """채팅 기록 삭제 API"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    try:
        chat_sessions.delete_many({'user_id': str(user_id)})
        return jsonify({
            'success': True,
            'message': '채팅 기록이 삭제되었습니다.'
        })
    except Exception as e:
        logger.error(f"채팅 기록 삭제 오류: {e}")
        return jsonify({'error': '채팅 기록 삭제에 실패했습니다.'}), 500

def get_chat_history(user_id, limit=20):
    """사용자의 최근 채팅 기록 조회"""
    try:
        messages = list(chat_sessions.find(
            {'user_id': str(user_id)},
            {'_id': 0, 'role': 1, 'content': 1}
        ).sort('timestamp', -1).limit(limit))
        
        # 시간순으로 정렬 (오래된 것부터)
        messages.reverse()
        return messages
    except Exception as e:
        logger.error(f"채팅 기록 조회 오류: {e}")
        return []

def save_message(user_id, role, content):
    """메시지 저장"""
    try:
        # OpenAI API 호환을 위해 'bot' -> 'assistant'로 변환해서 저장
        api_role = 'assistant' if role == 'bot' else role
        
        message_doc = {
            'user_id': str(user_id),
            'role': api_role,  # 'user' 또는 'assistant'
            'content': content,
            'timestamp': datetime.utcnow()
        }
        chat_sessions.insert_one(message_doc)
        
        # 사용자당 최대 100개 메시지 유지 (메모리 관리)
        message_count = chat_sessions.count_documents({'user_id': str(user_id)})
        if message_count > 100:
            # 가장 오래된 메시지들 삭제
            old_messages = list(chat_sessions.find(
                {'user_id': str(user_id)}
            ).sort('timestamp', 1).limit(message_count - 100))
            
            if old_messages:
                old_ids = [msg['_id'] for msg in old_messages]
                chat_sessions.delete_many({'_id': {'$in': old_ids}})
                
    except Exception as e:
        logger.error(f"메시지 저장 오류: {e}")

def build_conversation_context(chat_history, current_message, max_messages=10):
    """대화 컨텍스트 구성"""
    system_message = {
        "role": "system",
        "content": """당신은 '밥심이'라는 이름의 친근한 요리 도우미입니다. 
한국어로 대화하며, 레시피, 요리 팁, 재료 정보, 음식 추천 등에 대해 도움을 줍니다. 
특히 날씨나 기분에 따른 음식 추천을 잘 해줍니다.
짧고 친근하게 대답하세요. 200자 이내로 답변해주세요.
따뜻하고 공감하는 톤으로 이야기하세요."""
    }
    
    messages = [system_message]
    
    # 채팅 기록을 OpenAI API 형식으로 변환
    if chat_history and isinstance(chat_history, list):
        # 최근 기록만 포함 (토큰 한도 고려)
        recent_history = chat_history[-max_messages:] if len(chat_history) > max_messages else chat_history
        
        for msg in recent_history:
            if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                # 'bot' -> 'assistant'로 변환 (기존 데이터 호환성)
                role = 'assistant' if msg['role'] == 'bot' else msg['role']
                messages.append({
                    "role": role,
                    "content": str(msg['content'])
                })
    
    # 현재 사용자 메시지 추가
    messages.append({
        "role": "user",
        "content": str(current_message)
    })
    
    return messages

# 사용자 로그아웃 시 채팅 기록 삭제를 위한 헬퍼 함수
def clear_user_chat_history(user_id):
    """특정 사용자의 채팅 기록 삭제 (로그아웃 시 호출)"""
    try:
        chat_sessions.delete_many({'user_id': str(user_id)})
        logger.info(f"사용자 {user_id}의 채팅 기록 삭제 완료")
    except Exception as e:
        logger.error(f"채팅 기록 삭제 오류: {e}")

# 헬스 체크 엔드포인트
@chatbot_bp.route('/api/chatbot/health', methods=['GET'])
def health_check():
    if client:
        return jsonify({'status': 'healthy', 'service': '밥심이 챗봇'})
    else:
        return jsonify({'status': 'unhealthy', 'error': 'OpenAI API 설정 필요'}), 500

# 인덱스 생성 (성능 최적화)
try:
    chat_sessions.create_index([("user_id", 1), ("timestamp", -1)])
    chat_sessions.create_index([("timestamp", 1)])  # TTL 인덱스용
    print("MongoDB 인덱스 생성 완료")
except Exception as e:
    print(f"인덱스 생성 오류: {e}")