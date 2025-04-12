let countdownActive = false;
    const COUNTDOWN_TIME = 30;

    // OTP Input Handling
    document.querySelectorAll('.otp-input').forEach((input, index, inputs) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length === 1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && index > 0 && !e.target.value) {
          inputs[index - 1].focus();
        }
      });
    });

    async function handleVerification(event) {
      event.preventDefault();
      showLoading(true);
      clearErrors();

      const email = document.getElementById('email').value.trim();
      const otp = Array.from(document.querySelectorAll('.otp-input'))
                      .map(input => input.value)
                      .join('');

      // Validation
      if (!validateEmail(email)) {
        showError('email-error', 'Please enter a valid email address');
        showLoading(false);
        return;
      }

      if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        showError('otp-error', 'Please enter a valid 6-digit code');
        showLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp })
        });

        if (!response.ok) throw await response.json();

        document.querySelector('.success-message').style.display = 'flex';
        document.getElementById('verificationForm').style.display = 'none';
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } catch (error) {
        handleApiError(error);
      } finally {
        showLoading(false);
      }
    }

    async function resendOTP() {
      if (countdownActive) return;
      
      const email = document.getElementById('email').value.trim();
      if (!validateEmail(email)) {
        showError('email-error', 'Please enter your email first');
        return;
      }

      startCountdown();
      
      try {
        startCountdown();
        const response = await fetch("/api/resend-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          throw new Error('Gagal mengirim ulang OTP');
        }
      } catch (error) {
        showError('otp-error', error.message);
      }
    }

    function startCountdown() {
      let seconds = COUNTDOWN_TIME;
      countdownActive = true;
      const resendLink = document.getElementById('resendLink');

      resendLink.style.pointerEvents = 'none';
      const interval = setInterval(() => {
        document.getElementById('countdown').textContent = `(${--seconds}s)`;
        if (seconds <= 0) {
          clearInterval(interval);
          countdownActive = false;
          resendLink.style.pointerEvents = 'auto';
          document.getElementById('countdown').textContent = '';
        }
      }, 1000);
    }

    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showLoading(loading) {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = loading;
  document.getElementById('loader').style.display = loading ? 'block' : 'none';
  submitBtn.querySelector('span').style.display = loading ? 'none' : 'block';

  // Tambahkan redirect jika loading selesai (false)
  if (!loading) {
    // Ganti 'dashboard.html' sesuai tujuan
    window.location.href = 'dashboard.html';
  }
    }

    function showError(elementId, message) {
      const element = document.getElementById(elementId);
      element.querySelector('span').textContent = message;
      element.style.display = 'flex';
    }

    function clearErrors() {
      document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
      });
    }

    function handleApiError(error) {
      const message = error?.message || 'An unexpected error occurred';
      showError('otp-error', message);
    }

    function showToast(message, type) {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <i class='bx ${type === 'success' ? 'bx-check-circle' : 'bx-error'} '></i>
        <span>${message}</span>
      `;
      
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // Initialize form submission
    document.getElementById('verificationForm').addEventListener('submit', handleVerification);

    // Dynamic input validation
    document.getElementById('email').addEventListener('input', function(e) {
      if (!validateEmail(e.target.value)) {
        showError('email-error', 'Please enter a valid email');
      } else {
        document.getElementById('email-error').style.display = 'none';
      }
    });
