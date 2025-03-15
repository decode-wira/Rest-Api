    const notification = document.querySelector('.notification');
    const loader = document.querySelector('.loader');
    const loginBtn = document.querySelector('.login-btn');

    // Password Toggle
    document.querySelector('.password-toggle').addEventListener('click', function() {
        const password = document.getElementById('password');
        const icon = this.querySelector('i');
        const isVisible = password.type === 'text';
        
        password.type = isVisible ? 'password' : 'text';
        icon.classList.toggle('fa-eye-slash', !isVisible);
        icon.classList.toggle('fa-eye', isVisible);
    });

    // Enhanced Form Validation
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // UI Feedback
        loginBtn.disabled = true;
        loginBtn.querySelector('.btn-text').style.opacity = '0.5';
        loader.style.display = 'block';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();
            
            if (response.ok) {
                showNotification('Login successful! Redirecting...');
                localStorage.setItem('token', result.token);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                showNotification(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            showNotification('Network error. Please try again.', 'error');
        } finally {
            // Reset loading state
            loginBtn.disabled = false;
            loginBtn.querySelector('.btn-text').style.opacity = '1';
            loader.style.display = 'none';
        }
    });

    // Notification System
    function showNotification(message, type = 'success') {
        const icon = notification.querySelector('.notification-icon');
        notification.className = `notification ${type} show`;
        notification.querySelector('.notification-message').textContent = message;
        
        // Update icon
        icon.className = `notification-icon ${
            type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'
        }`;

        // Auto-hide
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    // Social Login Hover Effects
    document.querySelectorAll('.social-btn').forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-3px) scale(1.05)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Dynamic Background Animation
    document.querySelectorAll('.animated-blob').forEach((blob, index) => {
        blob.style.animationDelay = `${index * 5}s`;
    });