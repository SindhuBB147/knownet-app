// Profile page JavaScript functionality
document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded. Please include kn_api.js before this script.');
        return;
    }

    if (!window.KN.auth.requireAuth()) {
        return;
    }

    // Profile actions - declare variables before functions use them
    const shareBtn = document.querySelector('.header__actions .btn--secondary');
    const editBtn = document.querySelector('.header__actions .btn--primary');
    const addSkillBtn = document.getElementById('addSkillBtn');
    const skillsChips = document.getElementById('skillsChips');

    // Avatar Upload Elements
    const avatarContainer = document.getElementById('avatarContainer');
    const avatarUpload = document.getElementById('avatarUpload');
    const userAvatar = document.getElementById('userAvatar');

    // Load user profile
    loadProfile();
    loadActivity();
    loadSkills();

    // Avatar upload handlers
    if (avatarContainer && avatarUpload) {
        avatarContainer.addEventListener('click', () => {
            avatarUpload.click();
        });

        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                // Show loading state
                const originalSrc = userAvatar.src;
                userAvatar.style.opacity = '0.5';

                const result = await window.KN.api.post('/profile/avatar', formData, {
                    headers: {
                        // Let browser set Content-Type for FormData
                    }
                });

                // Update avatar with new URL (append timestamp to bust cache)
                if (result.avatar_url) {
                    // Assuming result.avatar_url is returned relative or absolute
                    // Only prepend API_BASE_URL if it's not a full URL and backend serves it as static
                    // Actually, previously assumed /uploads/, let's see what backend returned
                    // Backend returns "/uploads/avatars/..."
                    // Since it's in public folder, we can access it directly relative to root
                    userAvatar.src = result.avatar_url + '?t=' + new Date().getTime();

                    // Update auth cache
                    const currentUser = window.KN.auth.getUser();
                    if (currentUser && currentUser.profile) {
                        currentUser.profile.avatar_url = result.avatar_url;
                        window.KN.auth.save(localStorage.getItem('kn_token'), currentUser);
                    }
                    showMessage('Profile photo updated!', 'success');
                }
            } catch (error) {
                console.error('Avatar upload failed:', error);
                showMessage('Failed to upload photo', 'error');
                userAvatar.src = originalSrc; // Revert on error
            } finally {
                userAvatar.style.opacity = '1';
                avatarUpload.value = ''; // Reset input
            }
        });
    }

    async function loadProfile() {
        try {
            // Check for userId in URL
            const urlParams = new URLSearchParams(window.location.search);
            const targetUserId = urlParams.get('userId');
            const currentUser = window.KN.auth.getUser();

            let user;
            let isOwnProfile = true;

            if (targetUserId && currentUser && targetUserId != currentUser.id) {
                isOwnProfile = false;
                // Load public profile
                user = await window.KN.api.get(`/profile/${targetUserId}`);
                // Setup connection actions
                setupConnectionActions(targetUserId);
            } else {
                // Load own profile
                user = await window.KN.auth.refreshProfile();
            }

            if (!user) {
                showMessage('Unable to load profile. Please try again.', 'error');
                return;
            }

            // Hide/Show Edit/Share buttons based on ownership
            if (!isOwnProfile) {
                if (editBtn) editBtn.style.display = 'none';
                if (shareBtn) shareBtn.style.display = 'none';
                // Hide avatar upload
                if (avatarUpload) avatarUpload.parentElement.style.pointerEvents = 'none';
                const avatarOverlay = document.querySelector('.avatar-overlay');
                if (avatarOverlay) avatarOverlay.style.display = 'none';
                // Hide add skill btn
                if (addSkillBtn) addSkillBtn.style.display = 'none';
            }

            const profileInfo = user.profile || {};

            // Update profile header
            const profileTitle = document.getElementById('profile-title');
            if (profileTitle) profileTitle.textContent = user.name || 'User';

            const profileSubtitle = document.getElementById('profile-subtitle');
            if (profileSubtitle) {
                const roleLabel = user.role === 'mentor' ? 'Mentor' : user.role === 'admin' ? 'Admin' : 'Learner';
                const visibilityLabel = profileInfo.profile_visibility ? ` • ${formatVisibility(profileInfo.profile_visibility)}` : '';
                profileSubtitle.textContent = `${roleLabel} • ${user.location || 'Location not set'}${isOwnProfile ? visibilityLabel : ''}`;
            }

            // Update avatar
            if (profileInfo.avatar_url) {
                const userAvatar = document.getElementById('userAvatar');
                if (userAvatar) {
                    userAvatar.src = profileInfo.avatar_url;
                }
            }

            // Update about section
            const aboutText = document.getElementById('aboutText');
            if (aboutText) {
                if (profileInfo.bio) {
                    aboutText.textContent = profileInfo.bio;
                } else {
                    const intro =
                        user.role === 'mentor'
                            ? ' I love mentoring and helping learners grow.'
                            : ' I am currently building my expertise one session at a time.';
                    aboutText.textContent = `Welcome to ${user.name}'s profile on KnowNet!${intro}`;
                }
            }

            // Update meta information
            const profileLocation = document.getElementById('profileLocation');
            if (profileLocation) profileLocation.textContent = user.location || 'Location not set';

            const profileRole = document.getElementById('profileRole');
            if (profileRole) {
                const roleLabel = user.role === 'mentor' ? 'Mentor' : user.role === 'admin' ? 'Administrator' : 'Learner';
                profileRole.textContent = roleLabel;
            }

            const profileMemberSince = document.getElementById('profileMemberSince');
            if (profileMemberSince && user.created_at) {
                const joinDate = new Date(user.created_at);
                profileMemberSince.textContent = `Member since ${joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`;
            }

            const websiteRow = document.getElementById('profileWebsiteRow');
            const websiteLink = document.getElementById('profileWebsiteLink');
            if (websiteRow && websiteLink) {
                if (profileInfo.website) {
                    websiteLink.href = profileInfo.website.startsWith('http')
                        ? profileInfo.website
                        : `https://${profileInfo.website}`;
                    websiteLink.textContent = profileInfo.website.replace(/^https?:\/\//, '');
                    websiteRow.hidden = false;
                } else {
                    websiteRow.hidden = true;
                }
            }

        } catch (error) {
            console.error('[Profile] Error loading profile:', error);
            showMessage('Unable to load profile. Please try again.', 'error');
        }
    }

    async function setupConnectionActions(targetUserId) {
        const actionsContainer = document.querySelector('.header__actions');
        if (!actionsContainer) return;

        // Clear existing buttons
        actionsContainer.innerHTML = '';

        try {
            const statusData = await window.KN.api.get(`/connect/status/${targetUserId}`);

            // Create Action Button
            const actionBtn = document.createElement('button');
            actionBtn.className = 'btn btn--primary';

            if (!statusData.status) {
                // No connection -> Show Connect
                actionBtn.textContent = 'Connect';
                actionBtn.onclick = async () => {
                    try {
                        await window.KN.api.post(`/connect/request/${targetUserId}`);
                        showMessage('Connection request sent!', 'success');
                        setupConnectionActions(targetUserId); // Refresh
                    } catch (err) {
                        showMessage('Failed to send request', 'error');
                    }
                };
            } else if (statusData.status === 'pending') {
                if (statusData.is_sender) {
                    // Request Sent -> Show Pending (disabled)
                    actionBtn.textContent = 'Request Sent';
                    actionBtn.disabled = true;
                    actionBtn.classList.add('btn--secondary');
                } else {
                    // Request Received -> Show Accept
                    actionBtn.textContent = 'Accept Request';
                    actionBtn.onclick = async () => {
                        try {
                            await window.KN.api.post(`/connect/accept/${statusData.connection_id}`);
                            showMessage('Connection accepted!', 'success');
                            setupConnectionActions(targetUserId); // Refresh
                        } catch (err) {
                            showMessage('Failed to accept request', 'error');
                        }
                    };
                }
            } else if (statusData.status === 'accepted') {
                // Connected -> Show Message
                actionBtn.textContent = 'Message';
                actionBtn.onclick = () => {
                    // Redirect to chat with this user selected (needs chat implementation support)
                    window.location.href = `/pages/kn_chat.html?userId=${targetUserId}`;
                };
            }

            actionsContainer.appendChild(actionBtn);

        } catch (error) {
            console.error('Error checking connection status:', error);
        }
    }

    async function loadSkills() {
        if (!skillsChips) return;
        skillsChips.setAttribute('data-state', 'loading');
        skillsChips.innerHTML = '<span class="chip">Loading skills...</span>';
        try {
            const skills = await window.KN.api.get(`/profile/skills?t=${new Date().getTime()}`);
            if (!Array.isArray(skills) || skills.length === 0) {
                skillsChips.innerHTML = '<span class="chip chip--muted">No skills yet. Add one!</span>';
                skillsChips.removeAttribute('data-state');
                return;
            }
            skillsChips.innerHTML = skills.map(skill => {
                const level = skill.level ? `<span class="chip__level">${escapeHtml(skill.level)}</span>` : '';
                return `
                    <button class="chip chip--action" type="button" data-skill-id="${skill.id}">
                        <span class="chip__name">${escapeHtml(skill.name)}</span>
                        ${level}
                        <span class="chip__remove" aria-label="Remove skill">&times;</span>
                    </button>
                `;
            }).join('');
            skillsChips.removeAttribute('data-state');
        } catch (error) {
            console.error('[Profile] Error loading skills:', error);
            skillsChips.innerHTML = '<span class="chip chip--error">Unable to load skills</span>';
            skillsChips.removeAttribute('data-state');
        }
    }

    async function loadActivity() {
        try {
            const sessions = await window.KN.api.get('/sessions/', { auth: false });
            const activityList = document.getElementById('activityList');
            if (!activityList) return;

            if (!Array.isArray(sessions) || sessions.length === 0) {
                activityList.innerHTML = '<li class="post"><h3 class="post__title">No recent activity</h3><p class="post__meta">Join or create sessions to see activity here</p></li>';
                return;
            }

            // Show recent sessions user has joined or created
            const recentSessions = sessions.slice(0, 5);
            activityList.innerHTML = recentSessions.map(session => {
                const date = new Date(session.start_time);
                const timeAgo = getTimeAgo(date);
                return `
                    <li class="post">
                        <h3 class="post__title">Session: ${escapeHtml(session.title)}</h3>
                        <p class="post__meta">${timeAgo} • ${session.location}</p>
                    </li>
                `;
            }).join('');
        } catch (error) {
            console.error('[Profile] Error loading activity:', error);
            const activityList = document.getElementById('activityList');
            if (activityList) {
                activityList.innerHTML = '<li class="post"><h3 class="post__title">Unable to load activity</h3></li>';
            }
        }
    }

    function getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatVisibility(value) {
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    // Share profile functionality
    if (shareBtn) {
        shareBtn.addEventListener('click', function () {
            const user = window.KN.auth.getUser();
            const profileName = user ? user.name : 'KnowNet Profile';
            if (navigator.share) {
                navigator.share({
                    title: `${profileName} - KnowNet Profile`,
                    text: 'Check out my learning journey and skills on KnowNet!',
                    url: window.location.href
                }).then(() => {
                    showMessage('Profile shared successfully!', 'success');
                }).catch((error) => {
                    console.log('Error sharing:', error);
                    fallbackShare();
                });
            } else {
                fallbackShare();
            }
        });
    }

    function fallbackShare() {
        // Copy profile link to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showMessage('Profile link copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback: show link in prompt
            prompt('Copy this link to share your profile:', window.location.href);
        });
    }

    // Edit profile functionality
    if (editBtn) {
        editBtn.addEventListener('click', function () {
            window.location.href = 'kn_settings.html';
        });
    }

    if (addSkillBtn) {
        const addSkillForm = document.getElementById('addSkillForm');
        const skillNameInput = document.getElementById('skillNameInput');
        const skillLevelInput = document.getElementById('skillLevelInput');
        const cancelBtn = document.getElementById('cancelAddSkill');
        const submitBtn = document.getElementById('submitAddSkill');

        // Toggle form visibility
        addSkillBtn.addEventListener('click', () => {
            if (addSkillForm.hidden) {
                addSkillForm.hidden = false;
                skillNameInput.focus();
                addSkillBtn.style.display = 'none'; // Hide the "Add Skill" link while form is open
            }
        });

        // Cancel action
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                resetForm();
            });
        }

        // Submit action
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                await submitSkill();
            });
        }

        // Allow Enter key to submit
        if (skillNameInput) {
            skillNameInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') await submitSkill();
            });
        }

        function resetForm() {
            addSkillForm.hidden = true;
            skillNameInput.value = '';
            skillLevelInput.value = '';
            addSkillBtn.style.display = 'inline-block';
        }

        async function submitSkill() {
            const name = skillNameInput.value.trim();
            if (!name) {
                showMessage('Please enter a skill name', 'error');
                skillNameInput.focus();
                return;
            }

            const levelInput = skillLevelInput.value.trim();
            const level = levelInput.length >= 2 ? levelInput : null;

            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';

            try {
                const payload = { name: name };
                if (level) payload.level = level;

                await window.KN.api.post('/profile/skills', payload);
                showMessage('Skill added!', 'success');
                resetForm();
                loadSkills(); // Reload list
            } catch (error) {
                console.error('[Profile] Error adding skill:', error);
                showMessage(error.message || 'Unable to add skill', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    }

    if (skillsChips) {
        skillsChips.addEventListener('click', async (event) => {
            const removeBtn = event.target.closest('.chip__remove');
            if (!removeBtn) return;
            const chip = removeBtn.closest('[data-skill-id]');
            if (!chip) return;
            const skillId = chip.getAttribute('data-skill-id');
            if (!skillId) return;
            const confirmed = confirm('Remove this skill?');
            if (!confirmed) return;
            try {
                await window.KN.api.delete(`/profile/skills/${skillId}`);
                showMessage('Skill removed', 'success');
                loadSkills();
            } catch (error) {
                console.error('[Profile] Error removing skill:', error);
                showMessage(error.message || 'Unable to remove skill', 'error');
            }
        });
    }

    // Load achievements
    loadAchievements();

    async function loadAchievements() {
        const achievementsList = document.querySelector('.badge-list');
        if (!achievementsList) return;

        // Clear static content
        achievementsList.innerHTML = '<li class="badge">Loading...</li>';

        try {
            // Fetch stats (reuse dashboard overview or calculate from existing data)
            // For now, we can infer some achievements from the profile data we already have
            const user = window.KN.auth.getUser();
            const skills = await window.KN.api.get('/profile/skills');
            // We could also fetch session count if we had an endpoint, or use what we loaded in activity
            // Let's infer some simple achievements

            const badges = [];

            // 1. Membership Badge
            if (user && user.created_at) {
                const joinDate = new Date(user.created_at);
                const now = new Date();
                const diffTime = Math.abs(now - joinDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 365) {
                    badges.push('🏆 1 Year Club');
                } else if (diffDays > 30) {
                    badges.push('🥇 Active Member');
                } else {
                    badges.push('🌱 Newcomer');
                }
            }

            // 2. Skills Badge
            if (skills && skills.length >= 5) {
                badges.push('🧠 Polymath (5+ Skills)');
            } else if (skills && skills.length >= 1) {
                badges.push('📚 Skilled');
            }

            // 3. Activity Badge (Simulated for now based on role)
            if (user.role === 'mentor') {
                badges.push('🍎 Mentor');
            }

            if (badges.length === 0) {
                achievementsList.innerHTML = '<li class="badge badge--muted">No achievements yet. Keep learning!</li>';
            } else {
                achievementsList.innerHTML = badges.map(badge => `<li class="badge">${badge}</li>`).join('');
            }

            // Re-attach listeners for interactivity
            achievementsList.querySelectorAll('.badge').forEach(badge => {
                badge.addEventListener('click', function () {
                    const badgeText = this.textContent;
                    showMessage(`Achievement: ${badgeText}`, 'info');
                });
            });

        } catch (error) {
            console.error('Failed to load achievements', error);
            achievementsList.innerHTML = '<li class="badge badge--error">Unavailable</li>';
        }
    }

    // Profile stats animation
    const stats = document.querySelectorAll('.stat');
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStat(entry.target);
            }
        });
    }, observerOptions);

    stats.forEach(stat => {
        observer.observe(stat);
    });

    function animateStat(statElement) {
        const numberElement = statElement.querySelector('.stat-number');
        if (!numberElement) return;

        const finalNumber = parseInt(numberElement.textContent.replace(/[^\d]/g, ''));
        const duration = 2000; // 2 seconds
        const increment = finalNumber / (duration / 16); // 60fps
        let currentNumber = 0;

        const timer = setInterval(() => {
            currentNumber += increment;
            if (currentNumber >= finalNumber) {
                currentNumber = finalNumber;
                clearInterval(timer);
            }

            // Format number with appropriate suffix
            let displayNumber = Math.floor(currentNumber);
            if (displayNumber >= 1000) {
                displayNumber = (displayNumber / 1000).toFixed(1) + 'K';
            }

            numberElement.textContent = displayNumber + '+';
        }, 16);
    }

    // Social links (if any)
    const socialLinks = document.querySelectorAll('a[href^="http"]');
    socialLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            // Track external link clicks
            console.log('External link clicked:', this.href);
        });
    });

    // Profile completion progress
    function updateProfileCompletion() {
        const profileSections = [
            '.about',
            '.skills',
            '.achievements',
            '.activity'
        ];

        let completedSections = 0;
        profileSections.forEach(section => {
            if (document.querySelector(section)) {
                completedSections++;
            }
        });

        const completionPercentage = (completedSections / profileSections.length) * 100;

        // Show completion status
        if (completionPercentage < 100) {
            showMessage(`Profile ${Math.round(completionPercentage)}% complete. Add more details to improve your profile!`, 'info');
        }
    }

    // Initialize profile completion check
    updateProfileCompletion();

    // Message system
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

    // Mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.header .nav');
    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', (e) => {
            nav.classList.toggle('active');
            e.stopPropagation();
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                nav.classList.contains('active') &&
                !nav.contains(e.target) &&
                !mobileToggle.contains(e.target)) {
                nav.classList.remove('active');
            }
        });
    }

});
