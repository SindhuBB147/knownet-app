// Signup page JavaScript functionality

// Google OAuth configuration
let GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Fallback if config file doesn't load
const MAX_PASSWORD_LENGTH = 256;

// Use configuration from google-config.js if available
if (typeof window !== 'undefined' && window.GOOGLE_CONFIG) {
    GOOGLE_CLIENT_ID = window.GOOGLE_CONFIG.CLIENT_ID;
}

// Make handleGoogleSignup globally accessible
window.handleGoogleSignup = function (response) {
    try {
        // Decode the JWT token
        const payload = parseJwt(response.credential);

        console.log('Google user info:', payload);

        // Extract user information
        const userInfo = {
            email: payload.email,
            name: payload.name,
            given_name: payload.given_name,
            family_name: payload.family_name,
            picture: payload.picture,
            email_verified: payload.email_verified
        };

        // Show loading state
        showMessage('Verifying Google account...', 'info');

        // Simulate server verification and account creation
        setTimeout(() => {
            if (userInfo.email_verified) {
                showMessage(`Welcome ${userInfo.name}! Your Google account has been verified.`, 'success');

                // Store user info (in a real app, this would be sent to your backend)
                localStorage.setItem('user', JSON.stringify(userInfo));
                localStorage.setItem('authMethod', 'google');

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    window.location.href = 'kn_dashboard.html';
                }, 2000);
            } else {
                showMessage('Google account verification failed. Please try again.', 'error');
            }
        }, 1500);

    } catch (error) {
        console.error('Error handling Google signup:', error);
        showMessage('Error processing Google signup. Please try again.', 'error');
    }
};

// Google Sign-Up callback function
function handleGoogleSignup(response) {
    window.handleGoogleSignup(response);
}

// Function to decode JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT token:', error);
        throw new Error('Invalid token');
    }
}

// Initialize Google Sign-In when the library loads
function initializeGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts) {
        // Initialize the Google Sign-In library
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignup,
            context: 'signup',
            ux_mode: 'popup',
            auto_prompt: false
        });

        // Render the sign-in button (optional - we're using custom button)
        // google.accounts.id.renderButton(
        //     document.getElementById('google-signup-btn'),
        //     { theme: 'outline', size: 'large', text: 'continue_with' }
        // );

        console.log('Google Sign-In initialized successfully');
    } else {
        console.error('Google Sign-In library not loaded');
    }
}

// Message system (moved outside DOMContentLoaded to be globally accessible)
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message--${type}`;
    messageEl.innerHTML = `
        <span>${message}</span>
        <button class="message-close">&times;</button>
    `;

    // Add to page
    document.body.appendChild(messageEl);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageEl.remove();
    }, 5000);

    // Close button
    messageEl.querySelector('.message-close').addEventListener('click', () => {
        messageEl.remove();
    });
}

// Wait for Google library to load
function waitForGoogleLibrary() {
    if (typeof google !== 'undefined' && google.accounts) {
        initializeGoogleSignIn();
    } else {
        setTimeout(waitForGoogleLibrary, 100);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded. Please include kn_api.js before this script.');
        return;
    }
    const form = document.querySelector('.form');
    const skillTags = document.querySelectorAll('.skill-tag');
    const socialButtons = document.querySelectorAll('.btn--social');
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirm-password');

    if (passwordField) {
        passwordField.setAttribute('maxlength', MAX_PASSWORD_LENGTH);
    }
    if (confirmPasswordField) {
        confirmPasswordField.setAttribute('maxlength', MAX_PASSWORD_LENGTH);
    }

    // Skill tag selection functionality
    skillTags.forEach(tag => {
        tag.addEventListener('click', function (e) {
            e.preventDefault();
            const isSelected = this.classList.contains('selected');
            const selectedCount = document.querySelectorAll('.skill-tag.selected').length;

            if (!isSelected && selectedCount >= 5) {
                // Show shake animation and warning
                this.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    this.style.animation = '';
                }, 500);
                showMessage('You can select up to 5 skills', 'warning');
                return;
            }

            // Toggle selection
            this.classList.toggle('selected');
            updateSelectedSkillsCount();

            // Clear skills error when skills are selected
            const skillsGroup = document.querySelector('.form__group:has(.skills-grid)');
            if (skillsGroup && document.querySelectorAll('.skill-tag.selected').length > 0) {
                skillsGroup.classList.remove('error');
                const errorMessage = skillsGroup.querySelector('.error-message');
                if (errorMessage) {
                    errorMessage.remove();
                }
            }

            // Add visual feedback
            if (this.classList.contains('selected')) {
                this.style.transform = 'translateY(-2px) scale(1.05)';
                setTimeout(() => {
                    this.style.transform = 'translateY(-2px)';
                }, 200);
            }
        });
    });

    function updateSelectedSkillsCount() {
        const selectedSkills = document.querySelectorAll('.skill-tag.selected');
        const hint = document.querySelector('.form__hint');

        if (hint) {
            hint.textContent = `${selectedSkills.length}/5 skills selected`;

            if (selectedSkills.length === 5) {
                hint.style.color = '#10b981';
                hint.textContent += ' - Maximum reached';
            } else {
                hint.style.color = '#6b7280';
            }
        }
    }

    // Form validation
    function validateForm() {
        let isValid = true;

        // Clear previous error states
        document.querySelectorAll('.form__group').forEach(group => {
            group.classList.remove('error');
        });

        // Validate full name
        const fullnameInput = document.getElementById('fullname');
        if (!fullnameInput.value.trim()) {
            showFieldError(fullnameInput, 'Full name is required');
            isValid = false;
        } else if (fullnameInput.value.trim().length < 2) {
            showFieldError(fullnameInput, 'Full name must be at least 2 characters');
            isValid = false;
        }

        // Validate email
        const emailInput = document.getElementById('email');
        if (!emailInput.value.trim()) {
            showFieldError(emailInput, 'Email address is required');
            isValid = false;
        } else if (!isValidEmail(emailInput.value)) {
            showFieldError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        // Validate password
        const passwordInput = document.getElementById('password');
        if (!passwordInput.value.trim()) {
            showFieldError(passwordInput, 'Password is required');
            isValid = false;
        } else if (!isValidPassword(passwordInput.value)) {
            showFieldError(passwordInput, 'Password must be at least 8 characters with letters and numbers');
            isValid = false;
        } else if (passwordInput.value.length > MAX_PASSWORD_LENGTH) {
            showFieldError(passwordInput, `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`);
            isValid = false;
        }

        // Validate confirm password
        const confirmPasswordInput = document.getElementById('confirm-password');
        if (!confirmPasswordInput.value.trim()) {
            showFieldError(confirmPasswordInput, 'Please confirm your password');
            isValid = false;
        } else if (passwordInput.value !== confirmPasswordInput.value) {
            showFieldError(confirmPasswordInput, 'Passwords do not match');
            isValid = false;
        }

        // Validate location
        const locationInput = document.getElementById('location');
        if (!locationInput || !locationInput.value.trim()) {
            if (locationInput) {
                showFieldError(locationInput, 'Location is required');
            }
            isValid = false;
        } else if (locationInput.value.trim().length < 2) {
            showFieldError(locationInput, 'Location must be at least 2 characters');
            isValid = false;
        }

        // Validate skills selection
        const selectedSkills = document.querySelectorAll('.skill-tag.selected');
        const skillsGroup = document.querySelector('.form__group:has(.skills-grid)');

        if (selectedSkills.length === 0) {
            if (skillsGroup) {
                skillsGroup.classList.add('error');
                const existingError = skillsGroup.querySelector('.error-message');
                if (!existingError) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = 'Please select at least one skill that interests you';
                    skillsGroup.appendChild(errorDiv);
                }
            }
            showMessage('Please select at least one skill that interests you', 'warning');
            // Scroll to skills section
            const skillsSection = document.querySelector('.skills-grid');
            if (skillsSection) {
                skillsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            isValid = false;
        } else {
            // Clear skills error if skills are selected
            if (skillsGroup) {
                skillsGroup.classList.remove('error');
                const errorMessage = skillsGroup.querySelector('.error-message');
                if (errorMessage) {
                    errorMessage.remove();
                }
            }
        }

        return isValid;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function isValidPassword(password) {
        // At least 8 characters with letters and numbers
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        return passwordRegex.test(password);
    }

    // No need for byte-length helper now that we use Argon2 on the backend

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
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (validateForm()) {
                // Show loading state
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
                submitBtn.disabled = true;

                try {
                    // Collect form data
                    const formData = {
                        name: document.getElementById('fullname').value.trim(),
                        email: document.getElementById('email').value.trim(),
                        password: document.getElementById('password').value,
                        role: 'student', // Default role, can be changed if you add role selection
                        location: document.getElementById('location').value.trim() || 'Remote'
                    };

                    console.log('[Signup] Sending registration request:', formData);

                    const result = await window.KN.api.post('/auth/register', formData, { auth: false });
                    console.log('[Signup] Registration successful:', result);

                    // Store token and user data
                    window.KN.auth.save(result.access_token, result.user);

                    // Show success message
                    alert('Account created successfully');

                    // Show selected skills in success message
                    const selectedSkills = Array.from(document.querySelectorAll('.skill-tag.selected')).map(skill =>
                        skill.querySelector('.skill-name').textContent
                    );
                    if (selectedSkills.length > 0) {
                        setTimeout(() => {
                            showMessage(`You've selected: ${selectedSkills.join(', ')}`, 'info');
                        }, 1000);
                    }

                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = '/pages/kn_dashboard.html';
                    }, 2000);

                } catch (error) {
                    console.error('[Signup] Error:', error);
                    showMessage(error.message || 'Registration failed. Please try again.', 'error');

                    // Reset button
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Social signup buttons
    const googleButton = document.getElementById('google-signup-btn');
    if (googleButton) {
        googleButton.addEventListener('click', function (e) {
            e.preventDefault();

            // Check if Google library is loaded
            if (typeof google !== 'undefined' && google.accounts) {
                // Show loading state
                const originalText = this.innerHTML;
                this.innerHTML = '<svg class="spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="15.71" stroke-dashoffset="15.71"><animate attributeName="stroke-dasharray" dur="2s" values="0 31.42;15.71 15.71;0 31.42" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.71;-31.42" repeatCount="indefinite"/></circle></svg> Connecting to Google...';
                this.disabled = true;

                // Trigger Google Sign-In
                try {
                    google.accounts.id.prompt(); // This will show the One Tap UI
                    // Alternatively, you can use:
                    // google.accounts.id.renderButton(this, {theme: "outline", size: "large"});
                } catch (error) {
                    console.error('Error initiating Google Sign-In:', error);
                    showMessage('Error connecting to Google. Please try again.', 'error');
                    this.innerHTML = originalText;
                    this.disabled = false;
                }

                // Reset button after a timeout (in case user cancels)
                setTimeout(() => {
                    if (this.disabled) {
                        this.innerHTML = originalText;
                        this.disabled = false;
                    }
                }, 10000);
            } else {
                showMessage('Google Sign-In is not available. Please try again later.', 'error');
            }
        });
    }

    // Real-time validation
    const inputs = document.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function () {
            validateField(this);
        });

        input.addEventListener('input', function () {
            // Clear error on input
            const formGroup = this.closest('.form__group');
            formGroup.classList.remove('error');
            const errorMessage = formGroup.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        });
    });

    function validateField(input) {
        const fieldName = input.name || input.id;
        const value = input.value.trim();

        switch (fieldName) {
            case 'fullname':
                if (value && value.length < 2) {
                    showFieldError(input, 'Full name must be at least 2 characters');
                }
                break;
            case 'email':
                if (value && !isValidEmail(value)) {
                    showFieldError(input, 'Please enter a valid email address');
                }
                break;
            case 'password':
                if (value && !isValidPassword(value)) {
                    showFieldError(input, 'Password must be at least 8 characters with letters and numbers');
                }
                break;
            case 'confirm-password':
                const password = document.getElementById('password').value;
                if (value && value !== password) {
                    showFieldError(input, 'Passwords do not match');
                }
                break;
        }
    }

    // Password strength indicator
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            updatePasswordStrengthIndicator(strength);
        });
    }

    function calculatePasswordStrength(password) {
        let strength = 0;

        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        return strength;
    }

    function updatePasswordStrengthIndicator(strength) {
        let strengthText = '';
        let strengthColor = '';

        switch (strength) {
            case 0:
            case 1:
                strengthText = 'Very Weak';
                strengthColor = '#ef4444';
                break;
            case 2:
                strengthText = 'Weak';
                strengthColor = '#f97316';
                break;
            case 3:
                strengthText = 'Fair';
                strengthColor = '#eab308';
                break;
            case 4:
                strengthText = 'Good';
                strengthColor = '#22c55e';
                break;
            case 5:
                strengthText = 'Strong';
                strengthColor = '#10b981';
                break;
        }

        // Update or create strength indicator
        let indicator = document.querySelector('.password-strength');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'password-strength';
            passwordInput.parentNode.appendChild(indicator);
        }

        indicator.textContent = `Password strength: ${strengthText}`;
        indicator.style.color = strengthColor;
    }

    // Initialize selected skills count
    updateSelectedSkillsCount();

    // Initialize Google Sign-In
    waitForGoogleLibrary();
});
