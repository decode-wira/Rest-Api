        // Dark Mode Toggle
        const toggleDarkMode = document.querySelector('.toggle-dark-mode');
        toggleDarkMode.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = toggleDarkMode.querySelector('i');
            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });

        // Initialize Dark Mode
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            toggleDarkMode.querySelector('i').classList.add('fa-sun');
        }

        // Parallax Effect
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            
            document.querySelectorAll('.blob').forEach((blob, index) => {
                const speed = index === 0 ? 0.02 : 0.03;
                blob.style.transform = `translate(${x * 50 * speed}px, ${y * 50 * speed}px)`;
            });
        });

        // Scroll Animation
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = 1;
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        });

        document.querySelectorAll('.feature').forEach((el) => {
            el.style.opacity = 0;
            el.style.transform = 'translateY(30px)';
            observer.observe(el);
        });