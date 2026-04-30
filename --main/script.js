document.addEventListener('DOMContentLoaded', () => {
    // Reveal Animation on Scroll
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    const observeReveals = () => {
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    };
    observeReveals();

    // Navigation Logic
    window.navTo = (targetId) => {
        // Ensure home view is active (as everything is now in home view)
        const homeView = document.getElementById('view-home');
        if (homeView && !homeView.classList.contains('active')) {
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            homeView.classList.add('active');
        }

        // Update Nav Highlights
        updateNavHighlight(targetId);

        // Scroll to Section
        const section = document.getElementById(`section-${targetId}`);
        if (section) {
            const navHeight = 100;
            window.scrollTo({
                top: section.offsetTop - navHeight,
                behavior: 'smooth'
            });
        }
        
        // Load board data if navigating to board section
        if (targetId === 'board') refreshBoard();
        observeReveals();
    };

    function updateNavHighlight(id) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeNav = document.getElementById(`nav-${id}`);
        if (activeNav) activeNav.classList.add('active');
    }

    // Contact Form Submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // Firebase Firestore integration
                const { collection, addDoc, serverTimestamp } = window.fb;
                await addDoc(collection(window.db, "contacts"), {
                    ...data,
                    date: new Date().toLocaleString(),
                    createdAt: serverTimestamp()
                });
                
                alert('문의가 성공적으로 전송되었습니다.');
                contactForm.reset();
            } catch (error) {
                console.error('Error submitting contact form:', error);
                alert('전송 중 오류가 발생했습니다.');
            }
        });
    }

    // Board Logic
    const boardList = document.getElementById('board-list');
    const boardListContainer = document.getElementById('board-list-container');
    const boardFormContainer = document.getElementById('board-form-container');
    const boardForm = document.getElementById('board-form');
    const boardFormTitle = document.getElementById('board-form-title');

    window.refreshBoard = async () => {
        if (!boardList) return;
        try {
            const { collection, getDocs, query, orderBy } = window.fb;
            const q = query(collection(window.db, "posts"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const posts = [];
            querySnapshot.forEach((doc) => {
                posts.push({ id: doc.id, ...doc.data() });
            });
            renderBoard(posts);
        } catch (error) {
            console.error('Error fetching board:', error);
            boardList.innerHTML = '<div class="error">데이터를 불러오지 못했습니다. (Firebase 설정을 확인해주세요)</div>';
        }
    };

    function renderBoard(posts) {
        if (!posts || !posts.length) {
            boardList.innerHTML = '<div class="loading">작성된 게시글이 없습니다. 첫 번째 글을 남겨보세요!</div>';
            return;
        }

        boardList.innerHTML = posts.map(post => createPostHTML(post)).join('');
        observeReveals();
    }

    function createPostHTML(post, isReply = false) {
        return `
            <div id="post-${post.id}" class="${isReply ? 'reply-item' : 'post-item'} reveal">
                <div class="post-header">
                    <span class="post-author">${post.name}</span>
                    <span class="post-date">${post.date}</span>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    ${!isReply ? `<button class="action-btn" onclick="showBoardForm('${post.id}')">답글</button>` : ''}
                    <button class="action-btn edit" onclick="editPost('${post.id}', \`${post.content.replace(/`/g, '\\`')}\`)">수정</button>
                    <button class="action-btn delete" onclick="deletePost('${post.id}')">삭제</button>
                </div>
                ${post.replies && post.replies.length ? `
                    <div class="replies-container">
                        ${post.replies.map(reply => createPostHTML(reply, true)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    window.showBoardForm = (parentId = null) => {
        // Switch to the dedicated form view
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const formView = document.getElementById('view-board-form');
        if (formView) formView.classList.add('active');
        
        boardForm.reset();
        document.getElementById('post-id').value = '';
        document.getElementById('parent-id').value = parentId || '';
        boardFormTitle.innerText = parentId ? '답글 작성' : '새 글 작성';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.hideBoardForm = () => {
        // Return to the home view where the board section is
        navTo('board');
    };

    window.editPost = (id, content) => {
        boardListContainer.style.display = 'none';
        boardFormContainer.style.display = 'block';
        boardForm.reset();
        document.getElementById('post-id').value = id;
        document.getElementById('board-content').value = content;
        boardFormTitle.innerText = '글 수정하기';
    };

    window.deletePost = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const { doc, deleteDoc } = window.fb;
            await deleteDoc(doc(window.db, "posts", id));
            refreshBoard();
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    if (boardForm) {
        boardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(boardForm);
            const data = Object.fromEntries(formData.entries());
            const postId = document.getElementById('post-id').value;
            const parentId = document.getElementById('parent-id').value;

            try {
                const { collection, addDoc, doc, updateDoc, serverTimestamp } = window.fb;
                
                if (postId) {
                    // Edit action
                    await updateDoc(doc(window.db, "posts", postId), {
                        content: data.content,
                        date: new Date().toLocaleString() + " (수정됨)"
                    });
                } else {
                    // New post or reply
                    const newPost = {
                        name: data.name,
                        email: data.email,
                        content: data.content,
                        date: new Date().toLocaleString(),
                        createdAt: serverTimestamp(),
                        replies: []
                    };
                    
                    if (parentId) {
                        const { getDoc, doc, updateDoc } = window.fb;
                        const parentDocRef = doc(window.db, "posts", parentId);
                        const parentDocSnap = await getDoc(parentDocRef);
                        
                        if (parentDocSnap.exists()) {
                            const parentData = parentDocSnap.data();
                            const currentReplies = parentData.replies || [];
                            // Add new ID to the reply (client-side generated GUID or similar, but for now we'll just add the object)
                            const replyWithId = { ...newPost, id: Math.random().toString(36).substr(2, 9) };
                            await updateDoc(parentDocRef, {
                                replies: [...currentReplies, replyWithId]
                            });
                        }
                    } else {
                        await addDoc(collection(window.db, "posts"), newPost);
                    }
                }

                hideBoardForm();
                refreshBoard();
            } catch (error) {
                console.error('Error submitting board data:', error);
                alert('저장 중 오류가 발생했습니다.');
            }
        });
    }

    refreshBoard();

    // Custom Cursor
    const cursor = document.querySelector('.cursor-dot');
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
    });
});
