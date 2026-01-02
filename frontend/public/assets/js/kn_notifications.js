// Notifications page JavaScript functionality
document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded.');
        return;
    }

    const notificationsList = document.querySelector('.notifications-list');
    const badge = document.querySelector('.notification-badge');
    const filterTabs = document.querySelectorAll('.filter-tab');

    init();

    async function init() {
        // Setup filters
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                filterNotifications(tab.dataset.filter);
            });
        });

        // Load Real Data
        await loadNotifications();
    }

    async function loadNotifications() {
        if (!notificationsList) return;
        notificationsList.innerHTML = '<p class="status">Loading...</p>';

        try {
            // Fetch Pending Connection Requests
            const requests = await window.KN.api.get('/connect/requests');

            // Clear loading
            notificationsList.innerHTML = '';

            if ((!requests || !requests.length)) {
                showEmptyState();
                updateBadge(0);
                return;
            }

            // Render Requests
            requests.forEach(req => {
                renderConnectionRequest(req);
            });

            updateBadge(requests.length);

        } catch (error) {
            console.error('Failed to load notifications:', error);
            notificationsList.innerHTML = '<p class="status status--error">Failed to load notifications.</p>';
        }
    }

    function renderConnectionRequest(req) {
        const item = document.createElement('div');
        item.className = 'notification-item unread';
        item.dataset.type = 'invites'; // Classify connection requests as invites
        item.dataset.id = req.id;

        const timeLabel = new Date(req.created_at).toLocaleString();

        item.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-user-plus"></i>
            </div>
            <div class="notification-content">
                <div class="notification-header">
                    <h4>New Connection Request</h4>
                    <span class="notification-time">${timeLabel}</span>
                </div>
                <p><strong>${req.sender.name}</strong> wants to connect with you.</p>
                <div class="notification-actions">
                    <button class="btn btn--primary btn--small accept-btn">Accept</button>
                </div>
            </div>
        `;

        notificationsList.appendChild(item);

        // Bind Accept
        const acceptBtn = item.querySelector('.accept-btn');
        acceptBtn.addEventListener('click', () => handleAccept(req.id, acceptBtn));
    }

    async function handleAccept(connectionId, btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Accepting...';
        btn.disabled = true;

        try {
            await window.KN.api.post(`/connect/accept/${connectionId}`);
            btn.textContent = 'Accepted';
            btn.classList.add('btn--success');

            const item = btn.closest('.notification-item');
            if (item) item.classList.remove('unread');

            showMessage('Connection accepted!', 'success');

            // Optionally remove card or keep as history
            setTimeout(() => {
                // simple fade out
                item.style.opacity = '0.5';
            }, 1000);

        } catch (error) {
            console.error('Failed to accept:', error);
            btn.textContent = originalText;
            btn.disabled = false;
            showMessage('Failed to accept request.', 'error');
        }
    }

    function filterNotifications(filter) {
        const items = document.querySelectorAll('.notification-item');
        items.forEach(item => {
            if (filter === 'all' || item.dataset.type === filter) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function updateBadge(count) {
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }

    function showEmptyState() {
        notificationsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-bell-slash"></i></div>
                <h3>No New Requests</h3>
                <p>You have no pending connection requests at this time.</p>
            </div>
        `;
    }

    function showMessage(msg, type) {
        const div = document.createElement('div');
        div.className = `message message--${type}`;
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
});
