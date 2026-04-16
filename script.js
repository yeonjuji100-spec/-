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
        // Ensure home view is active
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById('view-home').classList.add('active');

        // Update Nav Highlights
        updateNavHighlight(targetId);

        // Scroll to Section
        const section = document.getElementById(`section-${targetId}`);
        if (section) {
            window.scrollTo({
                top: section.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    };

    window.switchView = (viewId) => {
        // Update Nav Highlights
        updateNavHighlight(viewId);

        // Update Views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        if (viewId === 'board') refreshBoard();
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
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    alert('문의가 성공적으로 전송되었습니다.');
                    contactForm.reset();
                }
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
            const response = await fetch('/api/board');
            const posts = await response.json();
            renderBoard(posts);
        } catch (error) {
            console.error('Error fetching board:', error);
            boardList.innerHTML = '<div class="error">데이터를 불러오지 못했습니다.</div>';
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
        boardListContainer.style.display = 'none';
        boardFormContainer.style.display = 'block';
        boardForm.reset();
        document.getElementById('post-id').value = '';
        document.getElementById('parent-id').value = parentId || '';
        boardFormTitle.innerText = parentId ? '답글 작성' : '새 글 작성';
        window.scrollTo({ top: boardFormContainer.offsetTop - 100, behavior: 'smooth' });
    };

    window.hideBoardForm = () => {
        boardFormContainer.style.display = 'none';
        boardListContainer.style.display = 'block';
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
            const response = await fetch('/api/board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: id })
            });
            const result = await response.json();
            if (result.success) refreshBoard();
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    if (boardForm) {
        boardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(boardForm);
            const data = Object.fromEntries(formData.entries());
            const postId = document.getElementById('post-id').value;
            const parentId = document.getElementById('parent-id').value;

            if (postId) {
                // Edit action
                data.action = 'edit';
                data.id = postId;
            } else {
                // New post or reply
                if (parentId) data.parentId = parentId;
            }

            try {
                const response = await fetch('/api/board', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    hideBoardForm();
                    refreshBoard();
                }
            } catch (error) {
                console.error('Error submitting board data:', error);
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
