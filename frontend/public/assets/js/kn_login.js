// Login page JavaScript functionality
document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded. Please include kn_api.js before this script.');
        return;
    }
    const form = document.querySelector('.form');
    const identifierInput = document.getElementById('identifier');
    const passwordInput = document.getElementById('password');
    const socialButtons = document.querySelectorAll('.btn--social');

    // VISIBLE DEBUGGER REMOVED (User Request)
    function log(msg) {
        console.log(`[Login] ${msg}`);
    }

    log("System Ready.");

    // Form validation
    function validateForm() {
        let isValid = true;

        // Clear previous error states
        document.querySelectorAll('.form__group').forEach(group => {
            group.classList.remove('error');
        });

        // Validate identifier (email only to match backend requirements)
        if (!identifierInput.value.trim()) {
            showFieldError(identifierInput, 'Email address is required');
            isValid = false;
        } else if (!isValidEmail(identifierInput.value)) {
            showFieldError(identifierInput, 'Please enter a valid email address');
            isValid = false;
        }

        // Validate password
        if (!passwordInput.value.trim()) {
            showFieldError(passwordInput, 'Password is required');
            isValid = false;
        } else if (passwordInput.value.length < 6) {
            showFieldError(passwordInput, 'Password must be at least 6 characters');
            isValid = false;
        }

        return isValid;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showFieldError(input, message) {
        const formGroup = input.closest('.form__group');
        formGroup.classList.add('error');

        // Remove existing error message
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
        log(`Validation Error: ${message}`);
    }

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        log("Submit button clicked.");

        if (validateForm()) {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            submitBtn.disabled = true;

            const payload = {
                email: identifierInput.value.trim().toLowerCase(),
                password: passwordInput.value
            };

            const loginUrl = '/auth/login';
            log(`Network Request: POST ${window.KN.API_BASE_URL}${loginUrl}`);
            log(`Payload Email: ${payload.email}`);

            window.KN.api.post(loginUrl, payload, { auth: false })
                .then(result => {
                    log("SUCCESS: Token received.");
                    window.KN.auth.save(result.access_token, result.user);
                    alert('Login successful');
                    setTimeout(() => {
                        window.location.href = '/pages/kn_dashboard.html';
                    }, 1500);
                })
                .catch(error => {
                    log(`FAILURE: ${error.message}`);
                    if (error.status) log(`Status Code: ${error.status}`);
                    if (error.message && error.message.includes('Failed to fetch')) {
                        log("HINT: This is usually a Firewall issue or mixed-content (http/https).");
                    }

                    console.error('[Login] Error:', error);
                    const msg = error.message || 'Login failed';
                    const detail = error.status ? `(Status: ${error.status})` : '';
                    showMessage(`Error: ${msg} ${detail}.`, 'error');
                })
                .finally(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    log("Process finished.");
                });
        } else {
            log("Form validation failed.");
        }
    });

    // Social login buttons
    socialButtons.forEach(button => {
        button.addEventListener('click', function () {
            log("Social login clicked (Simulation only).");
            const provider = 'Google';

            // Show loading state
            const originalText = this.textContent;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            this.disabled = true;

            // Simulate social login
            setTimeout(() => {
                this.textContent = originalText;
                this.disabled = false;
                showMessage(`Connected with ${provider}! Redirecting...`, 'success');

                setTimeout(() => {
                    window.location.href = 'kn_dashboard.html';
                }, 1500);
            }, 2000);
        });
    });

    // Real-time validation
    identifierInput.addEventListener('blur', function () {
        if (this.value.trim() && !isValidEmail(this.value)) {
            showFieldError(this, 'Please enter a valid email address');
        }
    });

    passwordInput.addEventListener('blur', function () {
        if (this.value.trim() && this.value.length < 6) {
            showFieldError(this, 'Password must be at least 6 characters');
        }
    });

    // Clear errors on input
    [identifierInput, passwordInput].forEach(input => {
        input.addEventListener('input', function () {
            const formGroup = this.closest('.form__group');
            formGroup.classList.remove('error');
            const errorMessage = formGroup.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        });
    });

    // Message system
    function showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message message--${type}`;
        messageEl.innerHTML = `
            <span>${message}</span>
            <button class="message-close">&times;</button>
        `;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, 5000);

        messageEl.querySelector('.message-close').addEventListener('click', () => {
            messageEl.remove();
        });
    }
});
