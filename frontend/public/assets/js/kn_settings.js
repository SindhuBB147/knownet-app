// Settings page JavaScript functionality
document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded. Please include kn_api.js before this script.');
        return;
    }

    if (!window.KN.auth.requireAuth()) {
        return;
    }

    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');

    // Forms & Inputs
    const profileForm = document.getElementById('profileForm');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const bioInput = document.getElementById('bio');
    const locationInput = document.getElementById('location');
    const websiteInput = document.getElementById('website');

    // Privacy
    const profileVisibilitySelect = document.getElementById('profileVisibility');
    const onlineStatusToggle = document.getElementById('onlineStatusToggle');
    const directMessagesToggle = document.getElementById('directMessagesToggle');

    // Notifications
    const notificationToggles = {
        session_invites: document.getElementById('notifySessionInvites'),
        community_updates: document.getElementById('notifyCommunityUpdates'),
        direct_messages: document.getElementById('notifyDirectMessages'),
        session_reminders: document.getElementById('notifySessionReminders'),
        new_achievements: document.getElementById('notifyNewAchievements'),
    };

    // Password & Account
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const changePasswordFormContainer = document.getElementById('changePasswordFormContainer');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const cancelPasswordChange = document.getElementById('cancelPasswordChange');

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const deleteAccountFormContainer = document.getElementById('deleteAccountFormContainer');
    const deleteAccountForm = document.getElementById('deleteAccountForm');
    const cancelDeleteAccount = document.getElementById('cancelDeleteAccount');

    const downloadDataBtn = document.querySelector('button.btn--secondary[onclick*="Download"], button.btn--secondary:nth-of-type(1)'); // Heuristic selector if no ID


    const state = {
        profile: null,
        notificationsSaveTimeout: null,
    };

    init();

    function init() {
        bindNavigation();
        bindProfilePictureUpload();
        bindProfileForm();
        bindPrivacyControls();
        bindNotificationControls();
        bindFeedbackForm();
        bindPasswordControls();
        bindAccountControls();
        showSection('profile');
        loadProfileDetails();
    }

    function bindNavigation() {
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                const section = item.getAttribute('data-section');
                showSection(section);
            });
        });
    }

    function showSection(sectionId) {
        sections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    function bindProfilePictureUpload() {
        const profilePictureInput = document.getElementById('profile-picture');
        const currentPicture = document.getElementById('current-picture');

        if (profilePictureInput && currentPicture) {
            // Click handler is inline in HTML, but we check change event
            profilePictureInput.addEventListener('change', async function (e) {
                const file = e.target.files[0];
                if (!file) return;

                // Preview immediately
                const reader = new FileReader();
                reader.onload = function (event) {
                    currentPicture.src = event.target.result;
                };
                reader.readAsDataURL(file);

                // Upload
                const formData = new FormData();
                formData.append('file', file);

                try {
                    showMessage('Uploading picture...', 'info');
                    const profileInfo = await window.KN.api.post('/profile/avatar', formData, {}); // Headers auto-set

                    if (profileInfo.avatar_url) {
                        // Update cache
                        const currentUser = window.KN.auth.getUser();
                        if (currentUser && currentUser.profile) {
                            currentUser.profile.avatar_url = profileInfo.avatar_url;
                            window.KN.auth.save(localStorage.getItem('kn_token'), currentUser);
                        }
                        showMessage('Profile picture updated!', 'success');
                    }
                } catch (error) {
                    console.error('Avatar upload failed:', error);
                    showMessage('Failed to upload picture. ' + (error.message || ''), 'error');
                }
            });
        }
    }

    async function loadProfileDetails() {
        toggleFormLoading(profileForm, true);
        try {
            const profile = await window.KN.auth.refreshProfile();
            state.profile = profile;
            populateProfileForm(profile);
            populatePrivacyControls(profile.profile);
            populateNotificationControls(profile.notifications);

            // Set email display
            const emailDisplay = document.getElementById('currentUserEmail');
            if (emailDisplay && profile.email) {
                emailDisplay.textContent = profile.email;
            }

            // Set current picture
            const currentPicture = document.getElementById('current-picture');
            if (currentPicture && profile.profile?.avatar_url) {
                currentPicture.src = profile.profile.avatar_url;
            }

        } catch (error) {
            console.error('[Settings] Failed to load profile details:', error);
            showMessage(error.message || 'Unable to load settings. Please try again.', 'error');
        } finally {
            toggleFormLoading(profileForm, false);
        }
    }

    function populateProfileForm(profile) {
        if (!profileForm) return;
        const nameParts = (profile.name || '').trim().split(/\s+/);
        const firstName = nameParts.shift() || '';
        const lastName = nameParts.join(' ');

        if (firstNameInput) firstNameInput.value = firstName;
        if (lastNameInput) lastNameInput.value = lastName;
        if (bioInput) bioInput.value = profile.profile?.bio || '';
        if (locationInput) locationInput.value = profile.location || '';
        if (websiteInput) websiteInput.value = profile.profile?.website || '';
    }

    function populatePrivacyControls(profileInfo) {
        if (!profileInfo) return;
        if (profileVisibilitySelect) profileVisibilitySelect.value = profileInfo.profile_visibility || 'public';
        if (onlineStatusToggle) onlineStatusToggle.checked = !!profileInfo.show_online_status;
        if (directMessagesToggle) directMessagesToggle.checked = !!profileInfo.allow_direct_messages;
    }

    function populateNotificationControls(notificationInfo) {
        if (!notificationInfo) return;
        Object.entries(notificationToggles).forEach(([key, input]) => {
            if (!input) return;
            input.checked = !!notificationInfo[key];
        });
    }

    function bindProfileForm() {
        if (!profileForm) return;
        profileForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const payload = {
                first_name: firstNameInput?.value?.trim() || '',
                last_name: lastNameInput?.value?.trim() || '',
                location: locationInput?.value?.trim() || '',
                bio: bioInput?.value?.trim() || null,
                website: websiteInput?.value?.trim() || null,
            };

            if (!payload.first_name || !payload.location) {
                showMessage('First name and location are required.', 'error');
                return;
            }

            toggleButton(submitBtn, true);
            try {
                const updated = await window.KN.api.put('/profile/details', payload);
                state.profile = updated;
                populateProfileForm(updated);
                showMessage('Profile updated successfully.', 'success');
            } catch (error) {
                console.error('[Settings] Failed to update profile:', error);
                showMessage(error.message || 'Unable to save profile changes.', 'error');
            } finally {
                toggleButton(submitBtn, false);
            }
        });
    }

    function bindPrivacyControls() {
        if (profileVisibilitySelect) {
            profileVisibilitySelect.addEventListener('change', savePrivacySettings);
        }
        if (onlineStatusToggle) {
            onlineStatusToggle.addEventListener('change', savePrivacySettings);
        }
        if (directMessagesToggle) {
            directMessagesToggle.addEventListener('change', savePrivacySettings);
        }
    }

    async function savePrivacySettings() {
        if (!state.profile) return;
        try {
            const payload = {
                profile_visibility: profileVisibilitySelect?.value || 'public',
                show_online_status: !!onlineStatusToggle?.checked,
                allow_direct_messages: !!directMessagesToggle?.checked,
            };
            const updated = await window.KN.api.put('/profile/privacy', payload);
            state.profile.profile = updated;
            showMessage('Privacy settings updated.', 'success');
        } catch (error) {
            console.error('[Settings] Failed to update privacy settings:', error);
            showMessage(error.message || 'Unable to save privacy settings.', 'error');
            // revert to last known state
            populatePrivacyControls(state.profile?.profile);
        }
    }

    function bindNotificationControls() {
        Object.values(notificationToggles).forEach(input => {
            if (!input) return;
            input.addEventListener('change', scheduleNotificationSave);
        });
    }

    function scheduleNotificationSave() {
        if (state.notificationsSaveTimeout) {
            clearTimeout(state.notificationsSaveTimeout);
        }
        state.notificationsSaveTimeout = setTimeout(saveNotificationSettings, 400);
    }

    async function saveNotificationSettings() {
        try {
            const payload = {
                session_invites: !!notificationToggles.session_invites?.checked,
                community_updates: !!notificationToggles.community_updates?.checked,
                direct_messages: !!notificationToggles.direct_messages?.checked,
                session_reminders: !!notificationToggles.session_reminders?.checked,
                new_achievements: !!notificationToggles.new_achievements?.checked,
            };
            const updated = await window.KN.api.put('/profile/notifications', payload);
            state.profile.notifications = updated;
            showMessage('Notification preferences saved.', 'success');
        } catch (error) {
            console.error('[Settings] Failed to update notifications:', error);
            showMessage(error.message || 'Unable to save notification preferences.', 'error');
            populateNotificationControls(state.profile?.notifications);
        }
    }

    function bindFeedbackForm() {
        const feedbackForm = document.querySelector('.feedback-form');
        if (!feedbackForm) return;
        feedbackForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const submitBtn = feedbackForm.querySelector('button[type="submit"]');

            const payload = {
                type: document.getElementById('feedback-type').value,
                subject: document.getElementById('feedback-subject').value,
                message: document.getElementById('feedback-message').value,
                include_screenshot: document.getElementById('include-screenshot').checked
            };

            toggleButton(submitBtn, true, 'Sending...');
            try {
                await window.KN.api.post('/profile/feedback', payload);
                showMessage('Feedback sent successfully! Thank you.', 'success');
                feedbackForm.reset();
            } catch (e) {
                showMessage('Failed to send feedback.', 'error');
            } finally {
                toggleButton(submitBtn, false, 'Send Feedback');
            }
        });
    }

    function bindPasswordControls() {
        if (changePasswordBtn && changePasswordFormContainer) {
            changePasswordBtn.addEventListener('click', () => {
                changePasswordFormContainer.style.display = 'block';
                changePasswordBtn.style.display = 'none';
            });
        }
        if (cancelPasswordChange) {
            cancelPasswordChange.addEventListener('click', () => {
                changePasswordFormContainer.style.display = 'none';
                changePasswordBtn.style.display = 'inline-block';
                changePasswordForm.reset();
            });
        }
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const current = document.getElementById('currentPassword').value;
                const newPass = document.getElementById('newPassword').value;
                const confirmPass = document.getElementById('confirmNewPassword').value;

                if (newPass !== confirmPass) {
                    showMessage('New passwords do not match.', 'error');
                    return;
                }

                const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
                toggleButton(submitBtn, true, 'Updating...');

                try {
                    await window.KN.api.post('/auth/change-password', {
                        current_password: current,
                        new_password: newPass
                    });
                    showMessage('Password updated successfully.', 'success');
                    changePasswordForm.reset();
                    changePasswordFormContainer.style.display = 'none';
                    changePasswordBtn.style.display = 'inline-block';
                } catch (err) {
                    showMessage(err.message || 'Failed to update password', 'error');
                } finally {
                    toggleButton(submitBtn, false, 'Update Password');
                }
            });
        }
    }

    function bindAccountControls() {
        // --- Email Change Controls ---
        const changeEmailBtn = document.getElementById('changeEmailBtn');
        const changeEmailFormContainer = document.getElementById('changeEmailFormContainer');
        const changeEmailForm = document.getElementById('changeEmailForm');
        const cancelEmailChange = document.getElementById('cancelEmailChange');

        if (changeEmailBtn && changeEmailFormContainer) {
            changeEmailBtn.addEventListener('click', () => {
                changeEmailFormContainer.style.display = 'block';
                changeEmailBtn.style.display = 'none';
            });
        }
        if (cancelEmailChange) {
            cancelEmailChange.addEventListener('click', () => {
                changeEmailFormContainer.style.display = 'none';
                changeEmailBtn.style.display = 'inline-block';
                changeEmailForm.reset();
            });
        }
        if (changeEmailForm) {
            changeEmailForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newEmail = document.getElementById('newEmail').value;
                const password = document.getElementById('emailPassword').value;

                const submitBtn = changeEmailForm.querySelector('button[type="submit"]');
                toggleButton(submitBtn, true, 'Updating...');

                try {
                    await window.KN.api.post('/auth/change-email', {
                        current_password: password,
                        new_email: newEmail
                    });

                    showMessage('Email updated successfully.', 'success');

                    // Update display
                    const emailDisplay = document.getElementById('currentUserEmail');
                    if (emailDisplay) emailDisplay.textContent = newEmail;

                    // Update local user
                    const currentUser = window.KN.auth.getUser();
                    if (currentUser) {
                        currentUser.email = newEmail;
                        window.KN.auth.save(localStorage.getItem('kn_token'), currentUser);
                    }

                    changeEmailForm.reset();
                    changeEmailFormContainer.style.display = 'none';
                    changeEmailBtn.style.display = 'inline-block';
                } catch (err) {
                    showMessage(err.message || 'Failed to update email', 'error');
                } finally {
                    toggleButton(submitBtn, false, 'Update Email');
                }
            });
        }

        // --- Data Download Controls ---
        const accountSection = document.getElementById('account');
        if (accountSection) {
            const btns = accountSection.querySelectorAll('button.btn--secondary');
            btns.forEach(btn => {
                if (btn.textContent.includes('Download Data')) {
                    btn.addEventListener('click', async () => {
                        toggleButton(btn, true, 'Preparing...');
                        try {
                            const data = await window.KN.api.get('/auth/data');
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `knownet-data-${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            showMessage('Data download started.', 'success');
                        } catch (e) {
                            showMessage('Failed to download data.', 'error');
                        } finally {
                            toggleButton(btn, false, 'Download Data');
                        }
                    });
                }
            });
        }

        // --- Account Deletion Controls ---
        if (deleteAccountBtn && deleteAccountFormContainer) {
            deleteAccountBtn.addEventListener('click', () => {
                deleteAccountFormContainer.style.display = 'block';
                deleteAccountBtn.style.display = 'none';
            });
        }
        if (cancelDeleteAccount) {
            cancelDeleteAccount.addEventListener('click', () => {
                deleteAccountFormContainer.style.display = 'none';
                deleteAccountBtn.style.display = 'inline-block';
                deleteAccountForm.reset();
            });
        }
        if (deleteAccountForm) {
            deleteAccountForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const password = document.getElementById('deletePassword').value;
                if (!confirm('Are you absolutely sure you want to delete your account? This cannot be undone.')) {
                    return;
                }

                const submitBtn = deleteAccountForm.querySelector('button[type="submit"]');
                toggleButton(submitBtn, true, 'Deleting...');

                try {
                    await window.KN.api.delete('/auth/account', {
                        body: { password: password }
                    });

                    alert('Account deleted. Goodbye.');
                    window.KN.auth.logout();
                } catch (err) {
                    showMessage(err.message || 'Failed to delete account. Check password.', 'error');
                } finally {
                    toggleButton(submitBtn, false, 'Confirm Delete');
                }
            });
        }
    }

    function toggleFormLoading(form, isLoading) {
        if (!form) return;
        form.classList.toggle('is-loading', isLoading);
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i> Loading...' : 'Save Changes';
        }
    }

    function toggleButton(button, isLoading, loadingText = 'Saving...') {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText || button.textContent;
            delete button.dataset.originalText;
            button.disabled = false;
        }
    }

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
