document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');
    const stones = document.querySelectorAll('.stone');
    const sun = document.querySelector('.sun');

    // Cloud Cursor Movement
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';

        // Sun Parallax
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        sun.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });

    // Scroll Logic: Overlap and Scale
    const animateStones = () => {
        const scrolled = window.pageYOffset;
        const viewportCenter = window.innerHeight / 2;

        stones.forEach((stone, index) => {
            const rect = stone.getBoundingClientRect();
            const stoneCenter = rect.top + rect.height / 2;
            const distance = viewportCenter - stoneCenter;
            
            // Calculate scale based on distance to center
            const scale = 1 + Math.max(0, (1 - Math.abs(distance) / viewportCenter) * 0.1);
            
            // Subtle rotation based on scroll speed or position
            const rotation = (distance * 0.01);

            // Apply transforms (keeping the margin stacking)
            // The negative margin in CSS handles the basic stacking.
            // We add a bit of parallax here.
            const parallax = distance * 0.05;
            
            // We only apply the scale if NOT hovered (CSS hover takes precedence)
            if (!stone.matches(':hover')) {
                stone.style.transform = `scale(${scale}) translateY(${parallax}px) rotate(${rotation}deg)`;
            }
        });

        requestAnimationFrame(animateStones);
    };

    animateStones();

    // Hover interactions for cursor scaling
    stones.forEach(stone => {
        stone.addEventListener('mouseenter', () => {
            cursor.style.scale = '1.5';
        });
        stone.addEventListener('mouseleave', () => {
            cursor.style.scale = '1';
        });
    });

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-overlay a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});
