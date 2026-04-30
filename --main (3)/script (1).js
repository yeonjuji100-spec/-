import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, 
    onSnapshot, query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// [가이드북 3단계] Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBLLBvl_OTjyycwH07XAbtbKsBWfSPeewA",
  authDomain: "myweb-ef5f6.firebaseapp.com",
  projectId: "myweb-ef5f6",
  storageBucket: "myweb-ef5f6.firebasestorage.app",
  messagingSenderId: "468734712496",
  appId: "1:468734712496:web:573190a076f49cc47af975",
  measurementId: "G-89WQLTBZCP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    // Reveal Animation on Scroll
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, observerOptions);

    const observeReveals = () => {
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    };
    observeReveals();

    // Navigation Logic
    window.navTo = (targetId) => {
        const homeView = document.getElementById('view-home');
        if (homeView && !homeView.classList.contains('active')) {
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            homeView.classList.add('active');
        }

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeNav = document.getElementById(`nav-${targetId}`);
        if (activeNav) activeNav.classList.add('active');

        const section = document.getElementById(`section-${targetId}`);
        if (section) {
            window.scrollTo({ top: section.offsetTop - 100, behavior: 'smooth' });
        }
        
        if (targetId === 'board') refreshBoard();
        observeReveals();
    };

    // Firebase 설정 확인
    const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";
    const boardList = document.getElementById('board-list');
    const boardForm = document.getElementById('board-form');
    const boardFormTitle = document.getElementById('board-form-title');
    let unsubscribeBoard = null;
    let localPosts = JSON.parse(localStorage.getItem('my_board_posts') || '[]');

    // [가이드북 4단계] 게시판 CRUD 기능 구현

    // 1. 게시물 작성 (Create)
    async function addPost(name, email, content) {
        if (!isFirebaseConfigured) {
            const newPost = { id: Date.now().toString(), name, email, content, date: new Date().toLocaleTimeString() };
            localPosts.unshift(newPost);
            localStorage.setItem('my_board_posts', JSON.stringify(localPosts));
            return;
        }
        await addDoc(collection(db, "posts"), { name, email, content, createdAt: serverTimestamp() });
    }

    // 2. 게시물 목록 불러오기 (Read)
    window.refreshBoard = () => {
        if (!boardList || unsubscribeBoard) return;
        if (isFirebaseConfigured) {
            const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
            unsubscribeBoard = onSnapshot(q, (snapshot) => {
                const posts = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    posts.push({ id: doc.id, ...data, date: data.createdAt ? data.createdAt.toDate().toLocaleDateString() : '방금 전' });
                });
                renderBoard(posts);
            });
        } else {
            renderBoard(localPosts);
        }
    };

    // 3. 게시글 수정 (Update)
    async function updatePost(postId, name, email, content) {
        if (!isFirebaseConfigured) {
            const index = localPosts.findIndex(p => p.id === postId);
            if (index !== -1) {
                localPosts[index] = { ...localPosts[index], name, email, content, date: new Date().toLocaleDateString() + ' (수정됨)' };
                localStorage.setItem('my_board_posts', JSON.stringify(localPosts));
            }
            return;
        }
        await updateDoc(doc(db, "posts", postId), { name, email, content, updatedAt: serverTimestamp() });
    }

    // 4. 게시글 삭제 (Delete)
    window.deletePost = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        if (isFirebaseConfigured) {
            try { await deleteDoc(doc(db, "posts", id)); } catch(e) { alert('삭제에 실패했습니다.'); }
        } else {
            localPosts = localPosts.filter(p => p.id !== id);
            localStorage.setItem('my_board_posts', JSON.stringify(localPosts));
            renderBoard(localPosts);
        }
    };

    function renderBoard(posts) {
        if (!posts || !posts.length) {
            boardList.innerHTML = '<div class="loading">작성된 게시글이 없습니다.</div>';
            return;
        }
        boardList.innerHTML = posts.map((post, index) => createPostHTML(post, index === 0)).join('');
        observeReveals();
    }

    function createPostHTML(post, isLatest = false) {
        return `
            <div id="post-${post.id}" class="post-item reveal ${isLatest ? 'latest-post' : ''}" 
                 style="background: rgba(10, 25, 47, 0.4); border: 1px solid ${isLatest ? 'var(--primary-color)' : 'rgba(0, 242, 255, 0.1)'}; 
                 border-radius: 15px; margin-bottom: 20px; padding: 25px; position: relative;
                 box-shadow: ${isLatest ? '0 0 15px rgba(0, 242, 255, 0.2)' : 'none'};">
                ${isLatest ? '<span style="position:absolute; top:-10px; left:20px; background:var(--primary-color); color:#000; padding:2px 10px; border-radius:10px; font-size:0.7rem; font-weight:800;">LATEST</span>' : ''}
                <div class="post-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 15px;">
                    <span class="post-author" style="color: var(--primary-color); font-weight: 800;">${post.name}</span>
                    <span class="post-date" style="color: #666; font-size: 0.85rem;">${post.date}</span>
                </div>
                <div class="post-content" style="color: #ccc; line-height: 1.6; white-space: pre-wrap;">${post.content}</div>
                <div class="post-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="action-btn edit" onclick="editPost('${post.id}', \`${post.content.replace(/`/g, '\\`')}\`, '${post.name}', '${post.email}')" style="background:none; border: 1px solid #444; color: #888; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-size: 0.8rem;">수정</button>
                    <button class="action-btn delete" onclick="deletePost('${post.id}')" style="background:none; border: 1px solid #444; color: #888; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-size: 0.8rem;">삭제</button>
                </div>
            </div>
        `;
    }

    window.showBoardForm = () => {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('view-board-form').classList.add('active');
        boardForm.reset();
        document.getElementById('post-id').value = '';
        if (boardFormTitle) boardFormTitle.innerText = '문의 및 요청사항 등록';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.hideBoardForm = () => navTo('board');

    window.editPost = (id, content, name, email) => {
        showBoardForm();
        document.getElementById('post-id').value = id;
        document.getElementById('board-name').value = name;
        document.getElementById('board-email').value = email;
        document.getElementById('board-content').value = content;
        if (boardFormTitle) boardFormTitle.innerText = '글 수정하기';
    };

    if (boardForm) {
        boardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = boardForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "등록 중...";
            const data = Object.fromEntries(new FormData(boardForm).entries());
            const postId = document.getElementById('post-id').value;
            try {
                if (postId) await updatePost(postId, data.name, data.email, data.content);
                else await addPost(data.name, data.email, data.content);
                hideBoardForm();
                if (!isFirebaseConfigured) renderBoard(localPosts);
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            } catch (error) {
                alert('저장에 실패했습니다.');
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }

    refreshBoard();

    const cursor = document.querySelector('.cursor-dot');
    document.addEventListener('mousemove', (e) => {
        if (cursor) cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
    });
});
