      document.querySelectorAll('.member-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                card.style.setProperty('--x', `${x}px`);
                card.style.setProperty('--y', `${y}px`);
            });
        });
        
        const circles = document.querySelectorAll('.deco-circle');
        circles.forEach((circle, index) => {
            circle.style.animation = `float ${3 + index}s ease-in-out infinite alternate`;
        });