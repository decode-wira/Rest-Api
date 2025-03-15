document.addEventListener("DOMContentLoaded", () => {  
    const form = document.getElementById('registerForm');  
    const notification = document.querySelector('.notification');  
    const passwordToggle = document.querySelector('.password-toggle');  

    if (passwordToggle) {  
        passwordToggle.addEventListener('click', () => {  
            const passwordInput = document.getElementById('password');  
            const icon = passwordToggle.querySelector('i');  

            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';  
            icon.classList.toggle('fa-eye-slash');  
        });  
    }  

    form.addEventListener('submit', async (e) => {  
        e.preventDefault();  

        // Ambil data input  
        const username = document.getElementById("username").value.trim();  
        const email = document.getElementById("email").value.trim();  
        const phone = document.getElementById("phone").value.trim();  
        const password = document.getElementById("password").value.trim();  

        const usernameError = document.getElementById("usernameError");  
        const emailError = document.getElementById("emailError");  
        const phoneError = document.getElementById("phoneError");  
        const passwordError = document.getElementById("passwordError");  

        // Reset pesan error  
        [usernameError, emailError, phoneError, passwordError].forEach(el => el?.classList.remove('show'));  

        let isValid = true;  

        // Validasi input  
        if (!username) {  
            usernameError.textContent = "Username tidak boleh kosong!";  
            usernameError.classList.add('show');  
            isValid = false;  
        } else if (username.length < 6) {  
            usernameError.textContent = "Username harus minimal 6 karakter!";  
            usernameError.classList.add('show');  
            isValid = false;  
        }  

        if (!email) {  
            emailError.textContent = "Email tidak boleh kosong!";  
            emailError.classList.add('show');  
            isValid = false;  
        } else {  
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  
            if (!emailPattern.test(email)) {  
                emailError.textContent = "Format email tidak valid!";  
                emailError.classList.add('show');  
                isValid = false;  
            }  
        }  

        if (!phone) {  
            phoneError.textContent = "Nomor telepon tidak boleh kosong!";  
            phoneError.classList.add('show');  
            isValid = false;  
        } else {  
            const phonePattern = /^\+?\d{10,15}$/;  
            if (!phonePattern.test(phone)) {  
                phoneError.textContent = "Nomor telepon harus 10-15 digit!";  
                phoneError.classList.add('show');  
                isValid = false;  
            }  
        }  

        if (!password) {  
            passwordError.textContent = "Password tidak boleh kosong!";  
            passwordError.classList.add('show');  
            isValid = false;  
        } else if (password.length < 6) {  
            passwordError.textContent = "Password harus minimal 6 karakter!";  
            passwordError.classList.add('show');  
            isValid = false;  
        }  

        if (!isValid) return;  

        // Kirim data ke backend  
        const formData = {  
            username,  
            password,  
            email,  
            phone  
        };  

        const registerBtn = document.querySelector('.register-btn');  
        const progressBar = document.querySelector('.progress-bar');  

        if (registerBtn) registerBtn.disabled = true;  
        if (progressBar) progressBar.style.width = '100%';  

        try {  
            const response = await fetch('/api/register', {  
                method: 'POST',  
                headers: { 'Content-Type': 'application/json' },  
                body: JSON.stringify(formData)  
            });  

            if (!response.ok) {  
                throw new Error("Terjadi kesalahan saat mendaftar.");  
            }  

            const result = await response.json();  
            
            console.log("Response:", result); // Debugging output

            if (result && result.message) {  
                if (result.message.toLowerCase().includes("owner account created successfully")) {  
                    showNotification("Mengarah Ke Dashboard", 'success');  
                    setTimeout(() => {  
                        window.location.href = "/dashboard";  
                    }, 2000);  
                } else {  
                    showNotification("Registrasi berhasil", 'success');  
                    setTimeout(() => {  
                        window.location.href = "/auth/verif";  
                    }, 2000);  
                }  
            } else {  
                throw new Error("Respon tidak valid dari server.");  
            }  
        } catch (error) {  
            console.error("Error:", error); // Debugging error
            showNotification(error.message || "Gagal menghubungi server.", 'error');  
        } finally {  
            if (registerBtn) registerBtn.disabled = false;  
            if (progressBar) progressBar.style.width = '0%';  
        }  
    });  

    function showNotification(message, type = 'success') {  
        if (!notification) return;  

        const icon = notification.querySelector('.notification-icon');  
        notification.className = `notification ${type} show`;  
        notification.querySelector('.notification-message').textContent = message;  

        icon.className = `notification-icon ${  
            type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'  
        }`;  

        setTimeout(() => notification.classList.remove('show'), 4000);  
    }  
});