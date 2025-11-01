// static/js/chatbot.js - 채팅 기록 유지 버전 (role 문제 수정)

class ChatBot {
    constructor() {
        this.isOpen = false;
        this.isTyping = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.historyLoaded = false;
        
        this.initElements();
        this.initEventListeners();
        this.initDraggable();
    }

    initElements() {
        this.button = document.getElementById('chatbotButton');
        this.window = document.getElementById('chatbotWindow');
        this.closeBtn = document.getElementById('chatbotClose');
        this.messages = document.getElementById('chatbotMessages');
        this.input = document.getElementById('chatbotInput');
        this.sendBtn = document.getElementById('chatbotSend');
        this.typingIndicator = document.getElementById('typingIndicator');
    }

    initEventListeners() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.sendMessage());
        }
        if (this.input) {
            this.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    initDraggable() {
        if (!this.button) return;

        let startTime, startX, startY;
        let isDragging = false;

        this.button.addEventListener('mousedown', (e) => {
            startTime = Date.now();
            startX = e.clientX;
            startY = e.clientY;
            isDragging = false;
            
            this.startDrag(e.clientX, e.clientY);
            
            const onMouseMove = (e) => {
                const deltaX = Math.abs(e.clientX - startX);
                const deltaY = Math.abs(e.clientY - startY);
                
                if (deltaX > 10 || deltaY > 10) {
                    isDragging = true;
                    this.drag(e.clientX, e.clientY);
                }
            };
            
            const onMouseUp = (e) => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                this.endDrag();
                
                const timeElapsed = Date.now() - startTime;
                if (!isDragging && timeElapsed < 200) {
                    this.toggle();
                }
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            e.preventDefault();
        });

        // 터치 이벤트
        this.button.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startTime = Date.now();
            startX = touch.clientX;
            startY = touch.clientY;
            isDragging = false;
            
            this.startDrag(touch.clientX, touch.clientY);
            e.preventDefault();
        });

        this.button.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - startX);
            const deltaY = Math.abs(touch.clientY - startY);
            
            if (deltaX > 10 || deltaY > 10) {
                isDragging = true;
                this.drag(touch.clientX, touch.clientY);
            }
            e.preventDefault();
        });

        this.button.addEventListener('touchend', (e) => {
            this.endDrag();
            
            const timeElapsed = Date.now() - startTime;
            if (!isDragging && timeElapsed < 200) {
                this.toggle();
            }
            e.preventDefault();
        });
    }

    startDrag(clientX, clientY) {
        this.isDragging = false;
        
        const rect = this.button.getBoundingClientRect();
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;
        
        this.button.style.transition = 'none';
        this.button.style.cursor = 'grabbing';
    }

    drag(clientX, clientY) {
        this.isDragging = true;
        
        const newX = clientX - this.dragOffset.x;
        const newY = clientY - this.dragOffset.y;
        
        const buttonSize = 60;
        const maxX = window.innerWidth - buttonSize;
        const maxY = window.innerHeight - buttonSize;
        
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        
        this.button.style.position = 'fixed';
        this.button.style.left = boundedX + 'px';
        this.button.style.top = boundedY + 'px';
        this.button.style.right = 'auto';
        this.button.style.bottom = 'auto';
    }

    endDrag() {
        this.button.style.transition = 'all 0.3s ease';
        this.button.style.cursor = 'pointer';
        
        this.snapToEdge();
        
        setTimeout(() => {
            this.isDragging = false;
        }, 100);
    }

    snapToEdge() {
        const rect = this.button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        const distances = {
            left: centerX,
            right: windowWidth - centerX,
            top: centerY,
            bottom: windowHeight - centerY
        };
        
        const minDistance = Math.min(...Object.values(distances));
        const closestEdge = Object.keys(distances).find(key => distances[key] === minDistance);
        
        const margin = 20;
        
        switch (closestEdge) {
            case 'left':
                this.button.style.left = margin + 'px';
                break;
            case 'right':
                this.button.style.left = (windowWidth - 60 - margin) + 'px';
                break;
            case 'top':
                this.button.style.top = margin + 'px';
                break;
            case 'bottom':
                this.button.style.top = (windowHeight - 60 - margin) + 'px';
                break;
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    async open() {
        if (this.window) {
            this.window.classList.add('open');
            this.isOpen = true;
            
            // 채팅 기록 로드 (처음 열 때만)
            if (!this.historyLoaded) {
                await this.loadChatHistory();
                this.historyLoaded = true;
            }
            
            if (this.input) {
                this.input.focus();
            }
        }
    }

    close() {
        if (this.window) {
            this.window.classList.remove('open');
            this.isOpen = false;
        }
    }

    async loadChatHistory() {
        try {
            this.showLoadingHistory();
            
            const response = await fetch('/api/chatbot/history');
            const data = await response.json();
            
            if (response.ok && data.success && data.messages) {
                this.clearMessages();
                
                // 환영 메시지 먼저 추가
                this.addMessage('안녕하세요! 저는 밥심이예요. 레시피나 요리에 관해 무엇이든 물어보세요!', 'bot', false);
                
                // 기존 채팅 기록 복원 - 핵심 수정 부분
                data.messages.forEach(msg => {
                    // 'assistant' role을 'bot'으로 변환해서 표시
                    const displayRole = msg.role === 'assistant' ? 'bot' : msg.role;
                    this.addMessage(msg.content, displayRole, false);
                });
                
                this.scrollToBottom();
            } else {
                // 기록이 없으면 환영 메시지만 표시
                this.clearMessages();
                this.addMessage('안녕하세요! 저는 밥심이예요. 레시피나 요리에 관해 무엇이든 물어보세요!', 'bot', false);
            }
        } catch (error) {
            console.error('채팅 기록 로드 오류:', error);
            // 오류 시에도 환영 메시지는 표시
            this.clearMessages();
            this.addMessage('안녕하세요! 저는 밥심이예요. 레시피나 요리에 관해 무엇이든 물어보세요!', 'bot', false);
        }
    }

    showLoadingHistory() {
        this.clearMessages();
        this.addMessage('채팅 기록을 불러오는 중...', 'bot', false);
    }

    clearMessages() {
        if (this.messages) {
            this.messages.innerHTML = '';
        }
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message || this.isTyping) return;

        this.addMessage(message, 'user');
        this.input.value = '';
        this.setTyping(true);

        try {
            const response = await this.callBackendAPI(message);
            this.setTyping(false);
            this.addMessage(response, 'bot');
        } catch (error) {
            this.setTyping(false);
            if (error.message.includes('로그인')) {
                this.addMessage('로그인이 필요합니다. 로그인 후 다시 시도해주세요.', 'bot');
            } else {
                this.addMessage('죄송해요, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'bot');
            }
            console.error('챗봇 API 오류:', error);
        }
    }

    async callBackendAPI(message) {
        const response = await fetch('/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('로그인이 필요합니다');
            }
            throw new Error(`API 오류: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.response;
    }

    addMessage(text, type, scroll = true) {
        if (!this.messages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        
        this.messages.appendChild(messageDiv);
        
        if (scroll) {
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        if (this.messages) {
            this.messages.scrollTop = this.messages.scrollHeight;
        }
    }

    setTyping(typing) {
        this.isTyping = typing;
        if (this.sendBtn) {
            this.sendBtn.disabled = typing;
        }
        if (this.typingIndicator) {
            this.typingIndicator.style.display = typing ? 'block' : 'none';
        }
        
        if (typing) {
            this.scrollToBottom();
        }
    }

    // 채팅 기록 삭제 (필요시 사용)
    async clearChatHistory() {
        try {
            const response = await fetch('/api/chatbot/clear', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.clearMessages();
                this.addMessage('안녕하세요! 저는 밥심이예요. 레시피나 요리에 관해 무엇이든 물어보세요!', 'bot');
                this.historyLoaded = true;
            }
        } catch (error) {
            console.error('채팅 기록 삭제 오류:', error);
        }
    }
}

// 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('chatbotButton')) {
        if (!window.chatBot) {
            window.chatBot = new ChatBot();
        }
    }
});