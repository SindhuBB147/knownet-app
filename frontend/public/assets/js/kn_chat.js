// Chat page JavaScript functionality
document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded. Please include kn_api.js before this script.');
        return;
    }

    if (!window.KN.auth.requireAuth()) {
        return;
    }

    // Chat functionality
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messagesContainer');
    const conversationList = document.getElementById('conversationList');
    const searchInput = document.querySelector('.search input');
    const threadTitle = document.getElementById('thread-title');
    const threadSubtitle = document.getElementById('thread-subtitle');
    const threadAvatar = document.querySelector('.thread__head .avatar img');
    const threadHeader = document.querySelector('.thread__head');

    // Mobile responsiveness helpers
    const backBtn = document.getElementById('mobile-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            currentContext = { type: null, id: null };
            updateActiveListItem();
            updateMobileView(false);
        });
    }

    function updateMobileView(showThread) {
        const chatContainer = document.querySelector('.chat');
        if (chatContainer) {
            if (showThread) {
                chatContainer.classList.add('show-thread');
            } else {
                chatContainer.classList.remove('show-thread');
            }
        }
    }

    let currentContext = { type: null, id: null }; // { type: 'connection'|'session', id: int }
    let messagesPollInterval = null;
    let allConnections = [];
    let allSessions = []; // To store joined sessions for the list

    // Initial load
    init();

    async function init() {
        // Load connections AND sessions
        await Promise.all([loadConnections(), loadJoinedSessions()]);

        // Check URL params for auto-selection
        const urlParams = new URLSearchParams(window.location.search);
        const connectionId = urlParams.get('connectionId');
        const sessionId = urlParams.get('sessionId');

        if (connectionId) {
            const conn = allConnections.find(c => c.id == connectionId);
            if (conn) {
                selectConnection(conn);
            }
        } else if (sessionId) {
            // Even if not in loaded lists (maybe just joined), try to select it
            // checking list first
            const session = allSessions.find(s => s.id == sessionId);
            if (session) {
                selectSession(session);
            } else {
                // Fetch session stats/verify access then load
                try {
                    // We can reuse the GET /sessions/{id} endpoint if exists, but we don't have it purely accessible easily yet without full session load
                    // But assume if user clicked it, they have access or we fail gracefully
                    // For now, let's just try to load messages and set basics if we can't get full details
                    await selectSessionById(sessionId);
                } catch (e) {
                    console.error("Failed to load session from URL", e);
                }
            }
        }
    }

    // Load active connections for conversation list
    async function loadConnections() {
        try {
            // Added trailing slash to prevent 307 Temporary Redirect which drops Auth headers
            const connections = await window.KN.api.get('/connect/');

            if (Array.isArray(connections)) {
                allConnections = connections;
            }
        } catch (error) {
            console.error('[Chat] Error loading connections:', error);
        }
        renderConversationList();
    }

    // Load joined sessions for conversation list
    async function loadJoinedSessions() {
        try {
            const sessions = await window.KN.api.get('/sessions/');
            const currentUser = window.KN.auth.getUser();

            if (Array.isArray(sessions) && currentUser) {
                allSessions = sessions;
            }
        } catch (error) {
            console.error('[Chat] Error loading sessions:', error);
        }
        renderConversationList();
    }

    function renderConversationList() {
        conversationList.innerHTML = '';

        if (allConnections.length === 0 && allSessions.length === 0) {
            conversationList.innerHTML = '<li class="conversation conversation--empty"><div class="meta"><div class="preview">No active chats.</div></div></li>';
            return;
        }

        // Render Connections
        if (allConnections.length > 0) {
            const header = document.createElement('li');
            header.style.padding = '10px 20px';
            header.style.fontSize = '0.8rem';
            header.style.color = '#888';
            header.style.fontWeight = 'bold';
            header.textContent = 'DIRECT MESSAGES';
            conversationList.appendChild(header);

            allConnections.forEach(conn => {
                const other = getOtherUser(conn);
                const li = document.createElement('li');
                li.className = 'conversation';
                if (currentContext.type === 'connection' && currentContext.id === conn.id) {
                    li.classList.add('conversation--active');
                }
                li.dataset.type = 'connection';
                li.dataset.id = conn.id;

                let avatarHtml;
                if (other.avatar_url) {
                    avatarHtml = `<img src="${other.avatar_url}" alt="${escapeHtml(other.name)}" style="width:100%;height:100%;object-fit:cover;">`;
                } else {
                    avatarHtml = other.name ? other.name[0].toUpperCase() : '?';
                }

                li.innerHTML = `
                    <div class="avatar" style="background: ${other.avatar_url ? 'none' : '#ccc'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; overflow: hidden;">
                        ${avatarHtml}
                    </div>
                    <div class="meta">
                        <div class="row"><span class="name">${escapeHtml(other.name || 'Unknown User')}</span></div>
                        <div class="preview">Direct Message</div>
                    </div>
                `;
                li.addEventListener('click', () => selectConnection(conn));
                conversationList.appendChild(li);
            });
        }

        // Render Sessions
        if (allSessions.length > 0) {
            const header = document.createElement('li');
            header.style.padding = '15px 20px 5px';
            header.style.fontSize = '0.8rem';
            header.style.color = '#888';
            header.style.fontWeight = 'bold';
            header.textContent = 'COMMUNITIES';
            conversationList.appendChild(header);

            allSessions.forEach(session => {
                const li = document.createElement('li');
                li.className = 'conversation';
                if (currentContext.type === 'session' && currentContext.id === session.id) {
                    li.classList.add('conversation--active');
                }
                li.dataset.type = 'session';
                li.dataset.id = session.id;

                const initials = session.title ? session.title.substring(0, 2).toUpperCase() : 'CO';

                li.innerHTML = `
                    <div class="avatar" style="background: var(--kn-teal, #17c3b2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.8rem;">
                        ${initials}
                    </div>
                    <div class="meta">
                        <div class="row"><span class="name">${escapeHtml(session.title)}</span></div>
                        <div class="preview">Community Chat</div>
                    </div>
                `;
                li.addEventListener('click', () => selectSession(session));
                conversationList.appendChild(li);
            });
        }
    }

    function getOtherUser(connection) {
        const currentUser = window.KN.auth.getUser();
        if (!connection || !currentUser) return { name: 'Unknown' };
        return connection.sender_id === currentUser.id ? connection.receiver : connection.sender;
    }

    async function selectConnection(connection) {
        currentContext = { type: 'connection', id: connection.id };
        const other = getOtherUser(connection);

        updateActiveListItem();
        updateMobileView(true);

        // UI Updates
        threadTitle.textContent = other.name;
        threadSubtitle.textContent = 'Direct Message';
        if (threadAvatar) {
            threadAvatar.src = other.avatar_url || '/assets/images/logo.jpg'; // Fallback
        }
        if (threadHeader) threadHeader.style.visibility = 'visible';

        enableComposer();
        await loadMessages();
        startPolling();
    }

    async function selectSession(session) {
        currentContext = { type: 'session', id: session.id };

        updateActiveListItem();
        updateMobileView(true);

        // UI Updates
        threadTitle.textContent = session.title;
        threadSubtitle.textContent = 'Community Channel';
        if (threadAvatar) {
            // Generate placeholder for session if needed, or use default
            threadAvatar.src = '/assets/images/logo.jpg';
        }
        if (threadHeader) threadHeader.style.visibility = 'visible';

        enableComposer();
        await loadMessages();
        startPolling();
    }

    // Fallback for session from URL not in list
    async function selectSessionById(sessionId) {
        // Fake a session object for UI
        currentContext = { type: 'session', id: sessionId };

        updateMobileView(true);

        threadTitle.textContent = "Community Session";
        threadSubtitle.textContent = "Loading...";
        if (threadHeader) threadHeader.style.visibility = 'visible';

        enableComposer();
        await loadMessages();

        // Try to update title from messages or fetch
        // (Optimistic loading)
        startPolling();
    }

    function updateActiveListItem() {
        document.querySelectorAll('.conversation').forEach(conv => conv.classList.remove('conversation--active'));
        const selector = `.conversation[data-type="${currentContext.type}"][data-id="${currentContext.id}"]`;
        const active = document.querySelector(selector);
        if (active) active.classList.add('conversation--active');
    }

    function enableComposer() {
        if (chatInput) chatInput.disabled = false;
        if (sendButton) sendButton.disabled = false;
    }

    function startPolling() {
        if (messagesPollInterval) clearInterval(messagesPollInterval);
        messagesPollInterval = setInterval(() => loadMessages(true), 3000);
    }

    async function loadMessages(silent = false) {
        if (!currentContext.id) return;

        try {
            let endpoint;
            if (currentContext.type === 'connection') {
                endpoint = `/messages/connection/${currentContext.id}`;
            } else {
                endpoint = `/messages/${currentContext.id}/messages`;
            }

            const messages = await window.KN.api.get(endpoint);

            if (!Array.isArray(messages)) return;

            const currentUser = window.KN.auth.getUser();
            if (!currentUser) return;

            if (!silent) {
                messagesContainer.innerHTML = '';
            } else {
                // Determine if we need to render new messages
                const existingCount = messagesContainer.querySelectorAll('.msg').length;
                if (messages.length === existingCount && messages.length > 0) {
                    const lastMsgId = messagesContainer.lastElementChild?.dataset?.messageId;
                    const lastFetchedId = messages[messages.length - 1]?.id;
                    if (String(lastMsgId) === String(lastFetchedId)) return;
                }
            }

            if (messages.length === 0) {
                if (!silent) messagesContainer.innerHTML = '<div class="msg msg--system"><div class="bubble">No messages yet. Say hello!</div></div>';
                return;
            }

            if (silent) {
                const existingIds = new Set(Array.from(messagesContainer.querySelectorAll('.msg')).map(m => m.dataset.messageId));
                messages.forEach(msg => {
                    if (!existingIds.has(String(msg.id))) {
                        renderMessage(msg, currentUser.id);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                });
            } else {
                messagesContainer.innerHTML = '';
                let lastDate = null;
                messages.forEach(msg => {
                    const msgDate = new Date(msg.timestamp);
                    const dateStr = msgDate.toDateString();

                    if (lastDate !== dateStr) {
                        const divider = document.createElement('div');
                        divider.className = 'date-divider';
                        divider.innerHTML = `<span>${getDateLabel(msgDate)}</span>`;
                        messagesContainer.appendChild(divider);
                        lastDate = dateStr;
                    }

                    renderMessage(msg, currentUser.id);
                });
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

        } catch (error) {
            console.error('[Chat] Error loading messages:', error);
            // Allow 403/404 to fail silently in polling?
            if (!silent) {
                messagesContainer.innerHTML = '<div class="msg msg--system"><div class="bubble">Unable to load messages. Please join the session or try again.</div></div>';
            }
        }
    }

    function renderMessage(msg, currentUserId) {
        const isMe = msg.sender_id === currentUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `msg msg--${isMe ? 'me' : 'peer'}`;
        messageDiv.dataset.messageId = msg.id;

        const timeString = window.KN.util.formatTime(msg.timestamp);

        messageDiv.innerHTML = `
            <div class="bubble">
                ${escapeHtml(msg.content)}
                ${isMe ? `<i class="fas fa-trash delete-btn" onclick="window.deleteChatMessage(${msg.id})" title="Delete Message"></i>` : ''}
            </div>
            <span class="time" title="${window.KN.util.formatDate(msg.timestamp)} ${timeString}">${timeString}</span>
        `;
        messagesContainer.appendChild(messageDiv);
    }

    // Global delete handler
    window.deleteChatMessage = async function (msgId) {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await window.KN.api.delete(`/messages/${msgId}`);
            // Refresh
            loadMessages();
        } catch (e) {
            console.error("Failed to delete message", e);
            alert(`Could not delete message. Error: ${e.message || e}`);
        }
    };

    async function sendMessage() {
        if (!currentContext.id || !chatInput) return;
        const message = chatInput.value.trim();
        if (!message) return;

        const originalText = sendButton.textContent;
        sendButton.disabled = true;
        sendButton.textContent = '...';

        try {
            let endpoint;
            if (currentContext.type === 'connection') {
                endpoint = `/messages/connection/${currentContext.id}`;
            } else {
                endpoint = `/messages/${currentContext.id}/messages`;
            }

            await window.KN.api.post(endpoint, { content: message });
            chatInput.value = '';
            await loadMessages(true);
        } catch (error) {
            console.error('[Chat] Error sending message:', error);
            showMessage(error.message || 'Failed to send message.', 'error');
        } finally {
            sendButton.disabled = false;
            sendButton.textContent = originalText;
            chatInput.focus();
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    if (sendButton) {
        sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    const videoCallBtn = document.querySelector('.icon-btn[aria-label="Start call"]');
    if (videoCallBtn) {
        videoCallBtn.addEventListener('click', () => {
            if (currentContext.type === 'connection') {
                window.location.href = `/pages/kn_meeting.html?connectionId=${currentContext.id}`;
            } else if (currentContext.type === 'session') {
                window.location.href = `/pages/kn_meeting.html?sessionId=${currentContext.id}`;
            } else {
                showMessage('Please select a chat first.', 'info');
            }
        });
    }

    function getDateLabel(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        }
    }

    function showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) existingMessage.remove();

        const messageEl = document.createElement('div');
        messageEl.className = `message message--${type}`;
        messageEl.style.position = 'fixed';
        messageEl.style.bottom = '20px';
        messageEl.style.right = '20px';
        messageEl.style.padding = '10px 20px';
        messageEl.style.borderRadius = '5px';
        messageEl.style.background = type === 'error' ? '#ff4d4f' : '#1890ff';
        messageEl.style.color = 'white';
        messageEl.style.zIndex = '1000';

        messageEl.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(messageEl);

        setTimeout(() => messageEl.remove(), 4000);
    }
});
