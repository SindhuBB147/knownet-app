// Dashboard page JavaScript functionality
console.log('[Dashboard] Script loaded');
document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded. Please include kn_api.js before this script.');
        return;
    }

    if (!window.KN.auth.requireAuth()) {
        return;
    }

    const elements = {
        welcomeName: document.getElementById('welcome-name'),
        welcomeSubtitle: document.getElementById('welcome-subtitle'),
        profileProgressCopy: document.getElementById('profile-progress-copy'),
        quickChips: document.getElementById('quick-chips'),
        recommendationsGrid: document.getElementById('recommendations-grid'),
        trendingSkills: document.getElementById('trending-skills'),
        upcomingSessions: document.getElementById('upcoming-sessions'),
        communityFeed: document.getElementById('community-feed'),
        notificationsList: document.getElementById('notification-list'),
        notificationBadge: document.querySelector('.notification-badge'),
        markAllReadBtn: document.getElementById('mark-all-read'),
    };

    const state = {
        overview: null,
        filterSkill: null,
    };

    init();

    async function init() {
        // Start live time updates
        window.KN.util.initLiveTimes();

        try {
            console.log('[Dashboard] Requesting overview data...');
            const overview = await window.KN.api.get('/dashboard/overview');
            console.log('[Dashboard] Overview data received:', overview);
            state.overview = overview;
            renderDashboard(overview);
        } catch (error) {
            console.error('[Dashboard] Failed to load overview:', error);
            if (elements.recommendationsGrid) {
                elements.recommendationsGrid.innerHTML = `<p class="status status--error">Error: ${error.message}<br>Check console for details.</p>`;
            }
            // Also show global error
            showMessage(`Failed to load dashboard: ${error.message}`, 'error');
        }

        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const query = e.target.value.trim();
                    if (query.length > 0) {
                        performSearch(query);
                    } else {
                        hideSearchResults();
                    }
                }, 300);
            });

            // Allow 'Enter' to search immediately
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(debounceTimer);
                    performSearch(e.target.value.trim());
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                performSearch(query);
            });
        }

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search')) {
                hideSearchResults();
            }
        });

        if (elements.markAllReadBtn) {
            elements.markAllReadBtn.addEventListener('click', markAllNotificationsRead);
        }

        // Mobile Menu Toggle logic
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 &&
                    sidebar.classList.contains('active') &&
                    !sidebar.contains(e.target) &&
                    !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            });
        }
    }

    // Initialize Notification Toggle immediately
    (function initNotificationToggle() {
        const notifBtn = document.getElementById('notif-btn');
        const notifPanel = document.getElementById('notification-panel');
        if (notifBtn && notifPanel) {
            console.log('[Dashboard] Notification toggle initialized');
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Toggle active class
                const isActive = notifPanel.classList.toggle('active');
                notifPanel.style.display = isActive ? 'block' : 'none'; // Explicit fallback
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
                    notifPanel.classList.remove('active');
                    notifPanel.style.display = 'none';
                }
            });
        } else {
            console.error('[Dashboard] Notification elements not found');
        }
    })();

    function renderDashboard(data) {
        renderWelcome(data.user);

        // Admin Admin Link Check
        if (data.user && data.user.role === 'admin') {
            const sidebarNav = document.querySelector('.sidebar .nav');
            // Check if link already exists
            if (sidebarNav && !sidebarNav.querySelector('a[href="/pages/kn_admin.html"]')) {
                const adminLink = document.createElement('a');
                adminLink.className = 'nav__item';
                adminLink.href = '/pages/kn_admin.html';
                adminLink.innerHTML = `
                    <span class="nav__icon" aria-hidden="true">🛡️</span>
                    <span class="nav__label">Admin Panel</span>
                `;
                // Insert before Settings if possible, else append
                const settingsLink = sidebarNav.querySelector('a[href="/pages/kn_settings.html"]');
                if (settingsLink) {
                    sidebarNav.insertBefore(adminLink, settingsLink);
                } else {
                    sidebarNav.appendChild(adminLink);
                }
            }
        }

        renderQuickChips(data.skills.quick_links || []);
        renderRecommendations(data.recommendations || []);
        renderUsersNearYou(data.users_near_you || []);
        renderTrendingSkills(data.trending_skills || []);
        renderUpcomingSessions(data.upcoming_sessions || []);
        renderFeed(data.feed || []);
        renderNotifications(data.notifications || []);
    }

    function renderUsersNearYou(users) {
        const grid = document.getElementById('users-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!users.length) {
            grid.innerHTML = '<p class="status status--muted">No users found nearby. Update your location to see matches.</p>';
            return;
        }
        users.forEach(user => {
            const card = document.createElement('article');
            card.className = 'card card--user';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '10px';
            card.style.padding = '1.25rem';

            // Only show distance if valid
            let distanceHtml = '';
            if (user.distance_km !== null) {
                distanceHtml = `<span class="status status--success" style="font-size:0.8rem;">${user.distance_km} km away</span>`;
            }

            let actionHtml = '';
            const conn = user.connection;

            if (conn && conn.status === 'accepted') {
                actionHtml = `
                    <button class="btn btn--primary btn--sm" data-action="chat-user" data-user-id="${user.id}">
                        <i class="fas fa-comment"></i> Chat
                    </button>`;
            } else if (conn && conn.status === 'pending') {
                if (conn.is_sender) {
                    actionHtml = `
                        <button class="btn btn--secondary btn--sm" disabled>
                            Request Sent
                        </button>`;
                } else {
                    actionHtml = `
                        <button class="btn btn--primary btn--sm" data-action="accept-connection" data-id="${conn.id}">Accept</button>
                        <button class="btn btn--danger btn--sm" data-action="reject-connection" data-id="${conn.id}">Reject</button>
                    `;
                }
            } else {
                actionHtml = `
                    <button class="btn btn--secondary btn--sm" data-action="connect-user" data-user-id="${user.id}">
                        Connect
                    </button>`;
            }

            // Avatar Handling
            let avatarHtml = `<div style="width:48px;height:48px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b;font-size:1.2rem;">${user.name ? user.name[0].toUpperCase() : '?'}</div>`;
            if (user.avatar_url) {
                let avatarUrl = user.avatar_url;
                if (!avatarUrl.startsWith('http')) {
                    const apiBase = window.KN.API_BASE_URL;
                    const baseURL = apiBase.endsWith('/api') ? apiBase.replace('/api', '') : apiBase;
                    const avatarPath = avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl;
                    avatarUrl = `${baseURL}${avatarPath}`;
                }
                avatarHtml = `<img src="${avatarUrl}" alt="${escapeHtml(user.name)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.1);">`;
            }

            // Skill matches
            let skillMatchHtml = '';
            if (user.shared_count > 0 && user.skill_matches) {
                const limit = 2;
                const shown = user.skill_matches.slice(0, limit);
                const remainder = user.skill_matches.length - limit;

                const chips = shown.map(s => `<span style="font-size:0.7rem; background:#eff6ff; color:#1e40af; padding:2px 8px; border-radius:12px;">${escapeHtml(s)}</span>`).join('');
                const more = remainder > 0 ? `<span style="font-size:0.7rem; color:#64748b;">+${remainder}</span>` : '';

                skillMatchHtml = `<div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">${chips}${more}</div>`;
            }

            card.innerHTML = `
                <div style="display:flex; gap:12px;">
                    ${avatarHtml}
                    <div style="flex:1; min-width:0;">
                         <div style="display:flex; justify-content:space-between; align-items:start;">
                            <h3 class="card__title" style="margin:0; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(user.name)}</h3>
                            ${distanceHtml}
                        </div>
                        <p class="card__meta" style="margin:2px 0 0; font-size:0.85rem;">${escapeHtml(user.location || '')}</p>
                        ${skillMatchHtml}
                    </div>
                </div>
                <div class="card__actions">
                    ${actionHtml}
                </div>
            `;
            grid.appendChild(card);
        });

        grid.addEventListener('click', async (event) => {
            const btn = event.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;

            if (action === 'connect-user') {
                const userId = btn.dataset.userId;
                btn.disabled = true;
                btn.textContent = 'Sending...';
                try {
                    await window.KN.api.post(`/connect/request/${userId}`);
                    btn.textContent = 'Pending';
                    alert('Connection request sent!');
                    // Refresh to update state
                    init();
                } catch (e) {
                    alert(e.message);
                    btn.disabled = false;
                    btn.textContent = 'Connect';
                }
            } else if (action === 'accept-connection') {
                const id = btn.dataset.id;
                await window.KN.api.post(`/connect/accept/${id}`);
                init(); // Refresh dashboard
            } else if (action === 'reject-connection') {
                const id = btn.dataset.id;
                await window.KN.api.delete(`/connect/reject/${id}`);
                init(); // Refresh dashboard
            } else if (action === 'chat-user') {
                window.location.href = `/pages/kn_chat.html?userId=${btn.dataset.userId}`;
            }
        });
    }

    function renderWelcome(user) {
        if (elements.welcomeName) {
            elements.welcomeName.textContent = user.name?.split(' ')[0] || 'Learner';
        }
        if (elements.welcomeSubtitle) {
            const completion = Math.round((user.profile_completion || 0) * 100);
            elements.welcomeSubtitle.textContent = `Your profile is ${completion}% complete • ${user.location || 'Location not set'}`;
        }
        if (elements.profileProgressCopy) {
            elements.profileProgressCopy.textContent = 'Add more skills and sessions to improve your recommendations.';
        }

        // Header Avatar
        const userMenuBtn = document.querySelector('.icon-btn[aria-label="User menu"]');
        let avatarUrl = user.avatar_url;
        // Fallback to local storage if API didn't return it in overview
        if (!avatarUrl) {
            const cached = window.KN.auth.getUser();
            if (cached && cached.profile && cached.profile.avatar_url) {
                avatarUrl = cached.profile.avatar_url;
            }
        }

        if (userMenuBtn && avatarUrl) {
            // Apply same fix as profile page: prepend backend URL if relative
            if (!avatarUrl.startsWith('http')) {
                const apiBase = window.KN.API_BASE_URL;
                const baseURL = apiBase.endsWith('/api')
                    ? apiBase.replace('/api', '')
                    : apiBase;
                const avatarPath = avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl;
                avatarUrl = `${baseURL}${avatarPath}`;
            }
            userMenuBtn.innerHTML = `<img src="${avatarUrl}" alt="Profile" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            userMenuBtn.style.padding = '0'; // Remove padding for image
            userMenuBtn.style.overflow = 'hidden';
        }
    }

    function renderQuickChips(labels) {
        if (!elements.quickChips) return;
        if (!labels.length) {
            elements.quickChips.innerHTML = '<p class="status status--muted">No quick links yet. Add skills to see them here.</p>';
            return;
        }
        elements.quickChips.innerHTML = '';
        labels.forEach(label => {
            const button = document.createElement('button');
            button.className = 'chip';
            button.textContent = label;
            button.addEventListener('click', () => {
                // Redirect to skills page with search query
                window.location.href = `/pages/kn_skills.html?search=${encodeURIComponent(label)}`;
            });
            elements.quickChips.appendChild(button);
        });
    }

    function renderRecommendations(list) {
        if (!elements.recommendationsGrid) return;
        elements.recommendationsGrid.innerHTML = '';
        if (!list.length) {
            elements.recommendationsGrid.innerHTML = '<p class="status status--empty">No recommendations yet. Create or join a session to get started.</p>';
            return;
        }
        list.forEach(item => {
            const card = document.createElement('article');
            card.className = 'card card--course';
            card.innerHTML = `
                <div class="card__tag">${item.category || 'Session'}</div>
                <h3 class="card__title">${escapeHtml(item.title)}</h3>
                <p class="card__meta">${escapeHtml(item.location || 'Remote')} • ${item.date_label || ''}${item.time_label ? ' @ ' + item.time_label : ''}</p>
                <p class="card__meta">${escapeHtml(item.description || 'No description')}</p>
                <div class="card__progress">
                    <div class="progress__bar" style="--p: ${Math.round((item.match_score || 0) * 100)}%"></div>
                    <span class="progress__label">${Math.round((item.match_score || 0) * 100)}% match</span>
                </div>
                <div class="card__actions">
                    <button class="btn btn--primary" data-action="join-session" data-session-id="${item.id}">
                        <i class="fas fa-video"></i> Join Session
                    </button>
                </div>
            `;
            elements.recommendationsGrid.appendChild(card);
        });
        elements.recommendationsGrid.addEventListener('click', handleJoinAction);
    }

    function renderTrendingSkills(skills) {
        if (!elements.trendingSkills) return;
        elements.trendingSkills.innerHTML = '';
        if (!skills.length) {
            elements.trendingSkills.innerHTML = '<span class="status status--muted">No trending skills yet.</span>';
            return;
        }
        skills.forEach(skill => {
            const span = document.createElement('span');
            span.className = 'skill';
            // Check if label contains count or separate
            // The object is {label: "Name", count: 5}
            span.innerHTML = `
                ${escapeHtml(skill.label)}
                <span style="margin-left:6px; font-size:0.75em; background:rgba(0,0,0,0.05); padding:1px 6px; border-radius:10px;">${skill.count}</span>
            `;
            elements.trendingSkills.appendChild(span);
        });
    }

    function renderUpcomingSessions(sessions) {
        if (!elements.upcomingSessions) return;
        elements.upcomingSessions.innerHTML = '';
        if (!sessions.length) {
            elements.upcomingSessions.innerHTML = '<li class="session"><div class="session__time">No upcoming sessions yet.</div></li>';
            return;
        }
        sessions.slice(0, 4).forEach(session => {
            const li = document.createElement('li');
            li.className = 'session';
            li.innerHTML = `
                <div class="session__time">${session.date_label || 'TBD'} ${session.time_label ? '• ' + session.time_label : ''}</div>
                <div class="session__body">
                    <h3 class="session__title">${escapeHtml(session.title)}</h3>
                    <p class="session__meta">${escapeHtml(session.location || 'Remote')}</p>
                </div>
                <button class="btn btn--primary" data-action="join-session" data-session-id="${session.id}">
                    <i class="fas fa-video"></i> Join
                </button>
            `;
            elements.upcomingSessions.appendChild(li);
        });
        elements.upcomingSessions.addEventListener('click', handleJoinAction);
    }

    function handleJoinAction(event) {
        const button = event.target.closest('[data-action="join-session"]');
        if (!button) return;
        const sessionId = button.dataset.sessionId;
        if (!sessionId) return;
        joinSession(sessionId, button);
    }

    async function joinSession(sessionId, button) {
        if (!window.KN.auth.requireAuth()) {
            return;
        }
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
        try {
            await window.KN.api.post(`/sessions/${sessionId}/join`);
            button.innerHTML = '<i class="fas fa-check"></i> Joined';
            button.classList.remove('btn--primary');
            button.classList.add('btn--success');
            showMessage('Session joined successfully!', 'success');
        } catch (error) {
            console.error('[Dashboard] Failed to join session:', error);
            showMessage(error.message || 'Unable to join session.', 'error');
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    function renderFeed(feedItems) {
        if (!elements.communityFeed) return;
        elements.communityFeed.innerHTML = '';
        if (!feedItems.length) {
            elements.communityFeed.innerHTML = '<li class="post"><p class="post__meta">No community updates yet.</p></li>';
            return;
        }
        feedItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'post';
            li.innerHTML = `
                <h3 class="post__title">${escapeHtml(item.title)}</h3>
                <p class="post__meta">${escapeHtml(item.meta || '')}</p>
            `;
            li.addEventListener('click', () => {
                if (item.session_id) {
                    window.location.href = `/pages/kn_chat.html?sessionId=${item.session_id}`;
                }
            });
            elements.communityFeed.appendChild(li);
        });
    }

    function renderNotifications(notifications) {
        if (!elements.notificationsList) return;
        elements.notificationsList.innerHTML = '';

        // Count unread
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }

        if (!notifications.length) {
            elements.notificationsList.innerHTML = '<li class="notif"><span class="time">No notifications yet.</span></li>';
            return;
        }
        notifications.forEach(notification => {
            const li = document.createElement('li');
            li.className = `notif notif--${notification.type}`;
            li.innerHTML = `
                <span class="notif__icon" aria-hidden="true">${getNotificationIcon(notification.type)}</span>
                <div class="notif__body">
                    <p><strong>${escapeHtml(notification.title)}</strong> ${escapeHtml(notification.body)}</p>
<span class="time" data-live-time="${notification.created_at}">${window.KN.util.formatRelativeTime(notification.created_at)}</span>
                    ${renderNotificationActions(notification)}
                </div>
            `;
            if (notification.read) {
                li.style.opacity = 0.5;
            }
            elements.notificationsList.appendChild(li);
        });

        // Add event listeners for actions
        elements.notificationsList.addEventListener('click', handleNotificationAction);
    }

    function renderNotificationActions(notification) {
        if (notification.type === 'connection_request') {
            return `
                <div class="notif__actions">
                    <button class="btn btn--primary btn--sm" data-action="accept-request" data-id="${notification.related_id || notification.id}">Accept</button>
                    <button class="btn btn--secondary btn--sm" data-action="reject-request" data-id="${notification.related_id || notification.id}">Reject</button>
                </div>
            `;
        }
        return '';
    }

    async function handleNotificationAction(event) {
        const btn = event.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (!action || !id) return;

        btn.disabled = true;
        try {
            if (action === 'accept-request') {
                await window.KN.api.post(`/connect/accept/${id}`);
                showMessage('Connection accepted', 'success');
            } else if (action === 'reject-request') {
                await window.KN.api.delete(`/connect/reject/${id}`);
                showMessage('Connection rejected', 'info');
            }
            // Refresh
            init();
        } catch (error) {
            console.error('Notification action failed:', error);
            showMessage(error.message, 'error');
            btn.disabled = false;
        }
    }

    async function markAllNotificationsRead() {
        if (!elements.notificationsList) return;
        try {
            await window.KN.api.post('/notifications/mark-all-read', {});
            elements.notificationsList.querySelectorAll('.notif').forEach(notif => {
                notif.style.opacity = 0.5;
            });
            // Reset Badge
            const badge = document.getElementById('notif-badge');
            if (badge) badge.style.display = 'none';

            showMessage('All notifications marked as read', 'success');
        } catch (error) {
            console.error('[Dashboard] Failed to mark notifications:', error);
            showMessage(error.message || 'Unable to update notifications.', 'error');
        }
    }

    async function performSearch(query) {
        if (!query) return;
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '<div style="padding:1rem; text-align:center; color:#666;">Searching...</div>';
        resultsContainer.style.display = 'block';

        try {
            const data = await window.KN.api.get(`/dashboard/search?q=${encodeURIComponent(query)}`);
            renderSearchResults(data);
        } catch (error) {
            console.error('Search failed:', error);
            resultsContainer.innerHTML = '<div style="padding:1rem; text-align:center; color:red;">Search failed. Try again.</div>';
        }
    }

    function renderSearchResults(data) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        if (!data.users.length && !data.skills.length && !data.sessions.length) {
            resultsContainer.innerHTML = '<div style="padding:1rem; text-align:center; color:#666;">No results found.</div>';
            return;
        }

        if (data.users.length > 0) {
            appendSearchGroup(resultsContainer, 'People', data.users, (user) => {
                let avatarUrl = user.avatar_url;
                if (avatarUrl && !avatarUrl.startsWith('http')) {
                    const apiBase = window.KN.API_BASE_URL;
                    const baseURL = apiBase.endsWith('/api') ? apiBase.replace('/api', '') : apiBase;
                    const avatarPath = avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl;
                    avatarUrl = `${baseURL}${avatarPath}`;
                }

                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.innerHTML = `
                    ${avatarUrl ?
                        `<img src="${avatarUrl}" class="search-avatar">` :
                        `<div class="search-avatar">${user.name.charAt(0)}</div>`
                    }
                    <div>
                        <div style="font-weight:600; color:#333;">${escapeHtml(user.name)}</div>
                        <div style="font-size:0.8rem; color:#666;">${escapeHtml(user.role || 'Member')} • ${escapeHtml(user.location || 'Unknown')}</div>
                    </div>
                `;
                div.addEventListener('click', () => {
                    window.location.href = `/pages/kn_profile.html?userId=${user.id}`; // Assuming profile page supports query param
                });
                return div;
            });
        }

        if (data.skills.length > 0) {
            appendSearchGroup(resultsContainer, 'Skills', data.skills, (item) => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.innerHTML = `
                   <div class="search-avatar" style="background:#e0f2f1; color:#009688;">★</div>
                   <div>
                        <div style="font-weight:600; color:#333;">${escapeHtml(item.skill)}</div>
                        <div style="font-size:0.8rem; color:#666;">Expert: ${escapeHtml(item.user.name)}</div>
                   </div>
                `;
                div.addEventListener('click', () => {
                    window.location.href = `/pages/kn_profile.html?userId=${item.user.id}`;
                });
                return div;
            });
        }

        if (data.sessions.length > 0) {
            appendSearchGroup(resultsContainer, 'Sessions', data.sessions, (session) => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.innerHTML = `
                    <div class="search-avatar" style="background:#fff3e0; color:#ff9800;">🎥</div>
                    <div>
                        <div style="font-weight:600; color:#333;">${escapeHtml(session.title)}</div>
                        <div style="font-size:0.8rem; color:#666;">${escapeHtml(session.date_label || '')}</div>
                    </div>
                `;
                div.addEventListener('click', () => {
                    // Assuming we have a session detail page or modal, for now maybe just alert or navigate
                    alert(`Selected session: ${session.title}`);
                });
                return div;
            });
        }
    }

    function appendSearchGroup(container, title, items, rowRenderer) {
        const titleDiv = document.createElement('div');
        titleDiv.className = 'search-group-title';
        titleDiv.textContent = title;
        container.appendChild(titleDiv);

        items.forEach(item => {
            const el = rowRenderer(item);
            container.appendChild(el);
        });
    }

    function hideSearchResults() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
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
        }, 4000);

        messageEl.querySelector('.message-close').addEventListener('click', () => {
            messageEl.remove();
        });
    }

    // Use centralized util function instead of local re-implementation
    function formatRelativeTime(dateString) {
        return window.KN.util.formatRelativeTime(dateString);
    }

    function getNotificationIcon(type) {
        switch (type) {
            case 'session':
                return '🎥';
            case 'message':
                return '💬';
            case 'achievement':
                return '🏆';
            case 'reminder':
                return '⏰';
            default:
                return '🔔';
        }
    }

    function escapeHtml(text = '') {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
