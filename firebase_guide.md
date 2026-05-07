# 파이어베이스(Firebase) 게시판 구현 가이드북

이 가이드는 HTML/JS로 제작된 홈페이지에 파이어베이스를 연동하여 실시간 게시판 기능을 추가하는 단계를 설명합니다.

---

## 1단계: 파이어베이스 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에 접속합니다.
2. **'프로젝트 추가'**를 클릭하고 이름을 입력합니다 (예: `school-portal`).
3. Google Analytics 설정은 선택 사항입니다 (테스트용이면 비활성화 가능).

## 2단계: 앱 등록 및 SDK 설정
1. 프로젝트 홈 화면에서 **웹 아이콘 (</>)**을 클릭합니다.
2. 앱 닉네임을 입력하고 **'앱 등록'**을 클릭합니다.
3. 화면에 나타나는 `firebaseConfig` 객체를 복사해 둡니다.
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

## 3단계: 데이터베이스(Firestore) 활성화
1. 왼쪽 메뉴에서 **빌드 > Firestore Database**를 선택합니다.
2. **'데이터베이스 만들기'**를 클릭합니다.
3. 위치 설정 후 **'테스트 모드에서 시작'**을 선택하여 초기 권한을 설정합니다 (나중에 보안 규칙 수정 필요).

## 4단계: 소스코드에 파이어베이스 연결
`index.html` 하단 또는 별도의 JS 파일에 다음 코드를 추가합니다.

```html
<!-- Firebase SDK 로드 -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

  // 2단계에서 복사한 설정
  const firebaseConfig = { ... };

  // 초기화
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // 게시글 가져오기 함수
  async function loadPosts() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const boardList = document.querySelector('.board-list');
    boardList.innerHTML = ''; // 초기화

    querySnapshot.forEach((doc) => {
      const post = doc.data();
      const row = `
        <div class="board-row">
          <span class="title">${post.title}</span>
          <span class="author">${post.author}</span>
          <span class="date">${post.date}</span>
        </div>
      `;
      boardList.innerHTML += row;
    });
  }

  // 게시글 작성 함수 (예시)
  async function writePost(title, author) {
    try {
      await addDoc(collection(db, "posts"), {
        title: title,
        author: author,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date()
      });
      loadPosts(); // 목록 갱신
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }

  // 초기 로드
  window.onload = loadPosts;
</script>
```

## 5단계: 주요 기능 구현 팁
- **보안 규칙**: 실제 배포 시에는 Firestore 규칙에서 `allow read, write: if request.auth != null;` 등을 통해 인증된 사용자만 쓰게 설정해야 합니다.
- **이미지 업로드**: 게시판에 사진을 올리려면 **Firebase Storage**를 사용하세요.
- **인증(Auth)**: 로그인 기능을 추가하려면 **Firebase Authentication**을 활성화하면 됩니다.

---
이 가이드를 따라하면 정적인 홈페이지가 데이터가 살아 움직이는 동적인 서비스로 바뀝니다!
