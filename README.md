# 🍲 밥상 뒤엎 (Babsang Overthrow)

> 다양한 레시피를 자유롭게 공유하고 탐색할 수 있는
> **Flask 기반 커뮤니티형 레시피 플랫폼**

같은 음식이라도 사람마다 조리 방식과 맛이 다르듯,
사용자들이 자신만의 레시피를 공유하고 탐색하며 새로운 조리 아이디어를 발견할 수 있는 커뮤니티 환경을 구축하는 것을 목표로 개발되었습니다.

본 프로젝트는 단순 게시판을 넘어 사용자 인증, 리뷰 상호작용, 검색 기능, 이미지 업로드, 그리고 AI 챗봇 인터랙션까지 포함한 **풀스택 웹 서비스 구현 경험 확보**를 목적으로 제작되었습니다.

---

## 🧠 프로젝트 목표

기존 레시피 서비스는 단방향 정보 제공 중심인 경우가 많으며 사용자 간 상호작용 및 개인화된 탐색 경험이 제한적입니다.

본 프로젝트는 다음을 목표로 합니다:

* 사용자 참여 기반 레시피 공유 커뮤니티 구축
* 리뷰 및 검색 기능을 통한 상호작용 강화
* AI 챗봇을 활용한 탐색 편의성 향상
* Flask 기반 웹 서비스 아키텍처 설계 경험 확보

---

## 📌 주요 기능

* **사용자 인증** — 회원가입, 로그인, 로그아웃
* **레시피 관리** — 게시, 수정, 삭제, 상세 조회
* **검색 기능** — 키워드 기반 레시피 탐색
* **마이페이지** — 사용자 정보 및 작성 콘텐츠 관리
* **리뷰 시스템** — 레시피 피드백 및 상호작용
* **챗봇 기능** — 사용자 질문 응답 인터페이스
* **이미지 업로드** — 레시피 이미지 저장 및 제공

---

## 🏗️ 시스템 아키텍처


### 구성 요소

* Flask 서버 기반 MVC 구조
* MongoDB 데이터 저장
* OpenAI API 챗봇 연동
* Blueprint 기반 기능 모듈화 라우팅

---

## 🛠 기술 스택

| 영역          | 기술                            |
| ----------- | ----------------------------- |
| Backend     | Python, Flask                 |
| Database    | MongoDB, PyMongo              |
| Frontend    | HTML, CSS, JavaScript, jQuery |
| AI          | OpenAI API                    |
| Environment | python-dotenv                 |
| Networking  | requests                      |
| Parsing     | beautifulsoup4                |

---

## 🔥 기술적 도전 과제

### Blueprint 구조 리팩토링

**문제**

* 기능 증가에 따른 단일 파일 비대화

**해결**

* 기능별 Blueprint 모듈 분리
* 유지보수성 향상 및 확장 가능한 구조 확보

### 사용자 이미지 업로드 처리

**문제**

* 파일 충돌 및 경로 관리 이슈

**해결**

* static/uploads 디렉토리 구조 분리
* 경로 관리 체계화

### 챗봇 API 연동

**문제**

* API 키 보안 및 요청 안정성

**해결**

* dotenv 기반 환경 변수 관리
* 요청 로직 모듈화

---

## 🚀 향후 개선 방향

* 추천 알고리즘 기반 레시피 개인화
* Docker 기반 배포 환경 구성
* Redis 세션 관리
* ElasticSearch 검색 고도화
* 사용자 평점 기반 랭킹 시스템

---

## 📦 설치

### 환경 설정

```bash
python -m venv venv
source venv/bin/activate
# Windows
# venv\Scripts\activate
```

`.env` 생성

```
OPENAI_API_KEY=YOUR_KEY
```

---

### 의존성 설치

```bash
pip install -r requirements.txt
```

---

## ▶ 실행

```bash
python app.py
```

접속

```
http://0.0.0.0:5004
```

---

## 📘 사용 방법

### 회원가입 / 로그인

메인 페이지에서 접근 가능하며 로그인 시 세션이 유지됩니다.

### 레시피 게시

제목, 내용, 이미지 입력 후 게시 가능

### 검색 및 조회

검색 페이지에서 레시피 탐색 후 상세 조회 가능

### 마이페이지

작성 게시물 관리 및 사용자 정보 확인

### 리뷰 작성

레시피 상세 페이지에서 작성 가능

### 챗봇 사용

질문 입력 시 AI 응답 제공

---

## 📂 프로젝트 구조

```
.
├── app.py
├── requirements.txt
├── .env.example
├── routes/
│   ├── chatbot.py
│   ├── login.py
│   ├── mypage.py
│   ├── post_detail.py
│   ├── post.py
│   ├── review.py
│   ├── search.py
│   └── sign.py
├── static/
│   ├── css/
│   ├── images/
│   ├── js/
│   └── uploads/
└── templates/
    ├── login.html
    ├── main.html
    ├── mypage.html
    ├── post.html
    ├── search_result.html
    ├── sign_success.html
    └── sign.html
```

---
