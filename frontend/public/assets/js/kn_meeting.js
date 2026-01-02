
document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded.');
        return;
    }

    if (!window.KN.auth.requireAuth()) {
        return;
    }

    const elements = {
        title: document.getElementById('meetingTitle'),
        status: document.getElementById('meetingStatus'),
        localVideo: document.getElementById('localVideo'),
        joinBtn: document.getElementById('joinBtn'),
        videoPlaceholder: document.getElementById('videoPlaceholder'),
        controlBtns: {
            mute: document.getElementById('muteBtn'),
            video: document.getElementById('videoBtn'),
            screen: document.getElementById('screenBtn'),
            leave: document.getElementById('leaveBtn'),
        }
    };

    let localStream = null;
    let params = new URLSearchParams(window.location.search);
    let connectionId = params.get('connectionId');
    let sessionId = params.get('sessionId');
    let isScreenSharing = false;
    let currentContext = { type: null, id: null }; // { type: 'connection'|'session', id: int }

    // WebRTC Variables
    let ws = null;
    let peerConnections = {}; // Map<senderId, RTCPeerConnection>
    let iceCandidateQueue = {}; // Map<peerId, RTCIceCandidate[]>
    let myId = Math.random().toString(36).substr(2, 9); // Simple random ID for this session

    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
        ]
    };

    const sessionSelect = document.getElementById('sessionSelect');

    init();
    loadSessionPicker(); // Load the picker options regardless of current state

    async function loadSessionPicker() {
        if (!sessionSelect) return;

        try {
            // Fetch both sessions and connections
            const [sessions, connections] = await Promise.all([
                window.KN.api.get('/sessions').catch(() => []),
                window.KN.api.get('/connect/').catch(() => [])
            ]);

            // Clear existing except first
            while (sessionSelect.options.length > 1) {
                sessionSelect.remove(1);
            }

            // Add Groups/Sessions
            if (sessions.length > 0) {
                const groupOpt = document.createElement('optgroup');
                groupOpt.label = "Live Sessions";
                sessions.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = `session:${s.id}`;
                    opt.textContent = s.title || `Session #${s.id}`;
                    if (currentContext.type === 'session' && String(currentContext.id) === String(s.id)) {
                        opt.selected = true;
                    }
                    groupOpt.appendChild(opt);
                });
                sessionSelect.appendChild(groupOpt);
            }

            // Add Connections (1:1)
            if (connections.length > 0) {
                const connOpt = document.createElement('optgroup');
                connOpt.label = "My Connections";
                const currentUser = window.KN.auth.getUser();
                connections.forEach(c => {
                    const other = c.sender_id === currentUser.id ? c.receiver : c.sender;
                    const opt = document.createElement('option');
                    opt.value = `connection:${c.id}`;
                    opt.textContent = other.name || 'User';
                    if (currentContext.type === 'connection' && String(currentContext.id) === String(c.id)) {
                        opt.selected = true;
                    }
                    connOpt.appendChild(opt);
                });
                sessionSelect.appendChild(connOpt);
            }

            // Handle change
            sessionSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (!val) return;
                const [type, id] = val.split(':');
                const url = new URL(window.location);
                url.searchParams.delete('sessionId');
                url.searchParams.delete('connectionId');

                if (type === 'session') {
                    url.searchParams.set('sessionId', id);
                } else {
                    url.searchParams.set('connectionId', id);
                }
                window.location.href = url.toString();
            });

        } catch (e) {
            console.error("Failed to load session picker", e);
        }
    }

    async function init() {
        if (connectionId) {
            currentContext = { type: 'connection', id: connectionId };
            await loadConnectionDetails(connectionId);
        } else if (sessionId) {
            currentContext = { type: 'session', id: sessionId };
            await loadSessionDetails(sessionId);
        } else {
            elements.title.textContent = "Meeting Room";
            elements.status.textContent = "Select a session or connection to start.";
        }

        elements.joinBtn.addEventListener('click', startMeeting);

        // Wire up controls
        elements.controlBtns.leave.addEventListener('click', endMeeting);
        elements.controlBtns.mute.addEventListener('click', toggleMute);
        elements.controlBtns.video.addEventListener('click', toggleVideo);
        elements.controlBtns.screen.addEventListener('click', toggleScreenShare);

        // Document Upload
        const fileInput = document.getElementById('resourceFileInput');
        const uploadArea = document.getElementById('resourceUploadArea');
        if (fileInput && uploadArea) {
            uploadArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileUpload);

            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('active');
            });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('active'));
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('active');
                if (e.dataTransfer.files.length) {
                    handleFileUpload({ target: { files: e.dataTransfer.files } });
                }
            });
        }
    }

    async function handleFileUpload(e) {
        if (!e.target.files.length) return;
        if (!currentContext.id) {
            alert("No active meeting/session.");
            return;
        }

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        // Show uploading state
        const uploadArea = document.getElementById('resourceUploadArea');
        const originalText = uploadArea.innerHTML;
        uploadArea.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        try {
            // Determine endpoint based on context
            // Note: Currently backend only has /meeting/documents/{connection_id}
            // We probably need /meeting/documents/session/{session_id} or update the generic endpoint.
            // For MVP, we'll assume meeting resources are only for connections OR verify if backend supports sessions.
            // Looking at backend/app/api/routes/meetings.py, it takes {connection_id}.
            // If this is a SESSION meeting, we might not have a connection_id.
            // This suggests MEETING resources might be limited to 1:1 connections in current backend,
            // OR we treat session_id as connection_id if the backend is generic (it's likely not).

            // FIXME: Start supporting session resources later. For now, only connection.
            if (currentContext.type === 'session') {
                throw new Error("File sharing in group sessions is not yet supported.");
            }

            const doc = await window.KN.api.post(`/meeting/documents/${currentContext.id}`, formData);

            // Refresh list
            loadDocumentsAndRecordings(currentContext.id);

            alert("File uploaded successfully!");

        } catch (error) {
            console.error("Upload failed", error);
            alert(`Failed to upload file. Error: ${error.message || error}`);
        } finally {
            uploadArea.innerHTML = originalText;
            if (e.target.value) e.target.value = ''; // Reset input
        }
    }

    async function loadDocumentsAndRecordings(id) {
        if (currentContext.type === 'session') return; // Not supported yet

        const docsContainer = document.getElementById('documents');
        if (!docsContainer) return;

        try {
            // Added timestamps to prevent caching
            const [docs, recordings] = await Promise.all([
                window.KN.api.get(`/meeting/documents/${id}?t=${Date.now()}`),
                window.KN.api.get(`/meeting/recordings/${id}?t=${Date.now()}`)
            ]);
            console.log("Docs loaded:", docs);
            console.log("Recordings loaded:", recordings);

            // Filter out the upload area to keep it
            const uploadArea = docsContainer.querySelector('.upload-area');
            const fileInput = docsContainer.querySelector('#resourceFileInput');
            docsContainer.innerHTML = '';
            if (uploadArea) docsContainer.appendChild(uploadArea);
            if (fileInput) docsContainer.appendChild(fileInput);

            const listContainer = document.createElement('div');
            listContainer.className = 'resource-list';
            listContainer.style.marginTop = '20px';

            if (docs.length === 0 && recordings.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'resource-empty';
                empty.textContent = 'No documents or recordings shared yet.';
                listContainer.appendChild(empty);
            } else {
                // Render Documents
                docs.forEach(doc => {
                    const item = document.createElement('div');
                    item.className = 'resource-item';
                    item.style.padding = '10px';
                    item.style.borderBottom = '1px solid #eee';
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.gap = '10px';

                    const iconClass = getFileIcon(doc.file_type);
                    // Check if current user is the uploader
                    const currentUser = window.KN.auth.getUser();
                    const isOwner = currentUser && doc.uploader_id === currentUser.id;

                    item.innerHTML = `
                        <div class="resource-icon" style="color: #666;"><i class="${iconClass}"></i></div>
                        <div class="resource-info" style="flex: 1; overflow: hidden;">
                            <a href="${window.KN.API_BASE_URL}/${doc.file_path}" target="_blank" style="display: block; font-weight: 500; color: #333; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                                ${doc.file_name}
                            </a>
                            <div class="resource-meta" style="font-size: 0.8rem; color: #999;">
                                ${window.KN.util.formatDate(doc.created_at)} • Document
                            </div>
                        </div>
                         <div style="display: flex; gap: 8px;">
                            <a href="${window.KN.API_BASE_URL}/${doc.file_path}" download class="resource-action" style="color: #666;" title="Download">
                                <i class="fas fa-download"></i>
                            </a>
                            ${isOwner ? `<i class="fas fa-trash resource-action" style="color: #ff6b6b; cursor: pointer;" onclick="window.deleteDocument(${doc.id}, '${id}')" title="Delete"></i>` : ''}
                        </div>
                    `;
                    listContainer.appendChild(item);
                });

                // Render Recordings
                recordings.forEach(rec => {
                    const item = document.createElement('div');
                    item.className = 'resource-item';
                    item.style.padding = '10px';
                    item.style.borderBottom = '1px solid #eee';
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.gap = '10px';

                    item.innerHTML = `
                         <div class="resource-icon" style="color: #e74c3c;"><i class="fas fa-video"></i></div>
                         <div class="resource-info" style="flex: 1; overflow: hidden;">
                            <a href="${window.KN.API_BASE_URL}/${rec.file_path}" target="_blank" style="display: block; font-weight: 500; color: #333; text-decoration: none;">
                                Meeting Recording
                            </a>
                            <div class="resource-meta" style="font-size: 0.8rem; color: #999;">
                                ${window.KN.util.formatDate(rec.created_at)}
                            </div>
                        </div>
                        <a href="${window.KN.API_BASE_URL}/${rec.file_path}" download class="resource-action" style="color: #666;">
                            <i class="fas fa-download"></i>
                        </a>
                    `;
                    listContainer.appendChild(item);
                });
            }

            docsContainer.appendChild(listContainer);

        } catch (e) {
            console.error("Failed to load resources", e);
        }
    }

    window.deleteDocument = async function (docId, connId) {
        if (!confirm("Are you sure you want to delete this document?")) return;
        try {
            await window.KN.api.delete(`/meeting/documents/${docId}`);
            alert("Document deleted successfully.");
            loadDocumentsAndRecordings(connId);
        } catch (e) {
            console.error("Failed to delete document", e);
            alert(`Could not delete document. Error: ${e.message || e}`);
        }
    };

    function getFileIcon(mimeType) {
        if (!mimeType) return 'fas fa-file';
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('image')) return 'fas fa-file-image';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fas fa-file-excel';
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fas fa-file-archive';
        return 'fas fa-file';
    }

    async function toggleScreenShare() {
        if (isScreenSharing) {
            // Stop Screen Sharing
            await stopScreenSharing();
        } else {
            // Start Screen Sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                // Handle user stopping via browser UI
                screenTrack.onended = () => {
                    stopScreenSharing();
                };

                // Replace track in local stream
                const videoSender = localStream.getVideoTracks()[0];
                localStream.removeTrack(videoSender);
                localStream.addTrack(screenTrack);

                // Update local video element
                elements.localVideo.srcObject = localStream;

                // Replace track in all peer connections
                Object.values(peerConnections).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

                isScreenSharing = true;

                // Update Button UI
                const icon = elements.controlBtns.screen.querySelector('i');
                icon.className = 'fas fa-stop-circle'; // Changed icon
                icon.style.color = '#e74c3c'; // Red color
                elements.controlBtns.screen.classList.add('active');

            } catch (err) {
                console.error("Error sharing screen:", err);
            }
        }
    }

    async function stopScreenSharing() {
        if (!isScreenSharing) return;

        try {
            // Get Camera Stream back - simplified, ideally reuse initial constraints or devices
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];

            // Stop the screen track if it's still running
            const screenTrack = localStream.getVideoTracks()[0];
            screenTrack.stop();

            // Replace current screen track with camera track
            localStream.removeTrack(screenTrack);
            localStream.addTrack(cameraTrack);

            // Update local video
            elements.localVideo.srcObject = localStream;

            // Replace track in peers
            Object.values(peerConnections).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(cameraTrack);
                }
            });

            isScreenSharing = false;

            // Reset Button UI
            const icon = elements.controlBtns.screen.querySelector('i');
            icon.className = 'fas fa-desktop';
            icon.style.color = '';
            elements.controlBtns.screen.classList.remove('active');

        } catch (err) {
            console.error("Failed to revert to camera:", err);
            alert("Could not restart camera. Please rejoin.");
        }
    }

    async function loadConnectionDetails(id) {
        try {
            // We fetch all active connections to find the name (simple approach)
            // Added trailing slash here to fix Auth issues
            const connections = await window.KN.api.get('/connect/');
            const conn = connections.find(c => String(c.id) === String(id));

            if (conn) {
                const currentUser = window.KN.auth.getUser();
                const other = conn.sender_id === currentUser.id ? conn.receiver : conn.sender;

                // Store peer name globally for overlay
                window.currentPeerName = other.name || 'User';

                elements.title.textContent = `Meeting with ${other.name || 'User'}`;
                elements.status.textContent = "Ready to join";


                // Init Chat
                initChat(id, currentUser.id, 'connection');

                // Init Participants
                // Ensure currentUser has avatar_url from storage if not present
                if (!currentUser.avatar_url && currentUser.profile && currentUser.profile.avatar_url) {
                    currentUser.avatar_url = currentUser.profile.avatar_url;
                }

                updateParticipantsList([currentUser, other]);

                // Load Resources
                loadDocumentsAndRecordings(id);
            } else {
                elements.title.textContent = "Connection not found";
            }
        } catch (e) {
            console.error(e);
            elements.title.textContent = "Error loading meeting";
        }
    }

    async function loadSessionDetails(id) {
        try {
            // Fetch session details
            const session = await window.KN.api.get(`/sessions/${id}`);
            const currentUser = window.KN.auth.getUser();

            if (session) {
                elements.title.textContent = session.title || "Group Session";
                elements.status.textContent = "Ready to join";
                window.currentPeerName = session.title;

                // Init Chat
                initChat(id, currentUser.id, 'session');

                // Participants - for now show just current user until others join WS? 
                // Or fetch attendance /sessions/{id}/attendance if exists.
                if (!currentUser.avatar_url && currentUser.profile && currentUser.profile.avatar_url) {
                    currentUser.avatar_url = currentUser.profile.avatar_url;
                }
                updateParticipantsList([currentUser]);

                // TODO: Load Session Resources if supported
            }
        } catch (e) {
            console.error('Error loading session', e);
            elements.title.textContent = "Session not found or Access Denied";
        }
    }

    // Chat Logic
    let chatPollInterval = null;
    const chatElements = {
        container: document.getElementById('chatMessages'),
        input: document.getElementById('chatInput'),
        sendBtn: document.getElementById('sendChat')
    };

    function initChat(id, currentUserId, type) {
        if (!chatElements.container) return; // Sidebar not present?

        loadChatMessages(id, currentUserId, type);

        // Poll for new messages
        if (chatPollInterval) clearInterval(chatPollInterval);
        chatPollInterval = setInterval(() => loadChatMessages(id, currentUserId, type, true), 3000);

        // Send handlers
        const send = async () => {
            const text = chatElements.input.value.trim();
            if (!text) return;
            chatElements.input.value = '';
            try {
                let endpoint;
                if (type === 'connection') {
                    endpoint = `/messages/connection/${id}`;
                } else {
                    endpoint = `/messages/${id}/messages`;
                }

                await window.KN.api.post(endpoint, { content: text });
                loadChatMessages(id, currentUserId, type, true);
            } catch (e) {
                console.error("Failed to send", e);
            }
        };

        if (chatElements.sendBtn) chatElements.sendBtn.onclick = send;
        if (chatElements.input) chatElements.input.onkeypress = (e) => {
            if (e.key === 'Enter') send();
        };
    }

    async function loadChatMessages(id, currentUserId, type, silent = false) {
        try {
            let endpoint;
            if (type === 'connection') {
                endpoint = `/messages/connection/${id}`;
            } else {
                endpoint = `/messages/${id}/messages`;
            }

            const messages = await window.KN.api.get(endpoint);
            if (!Array.isArray(messages)) return;

            // Simple render (could optimize like kn_chat.js)
            if (!silent) chatElements.container.innerHTML = '';

            // Check count for silent update optimization
            if (silent && chatElements.container.children.length === messages.length) return;

            chatElements.container.innerHTML = ''; // Re-render for simplicity in this prototype

            messages.forEach(msg => {
                const isMe = msg.sender_id === currentUserId;
                const div = document.createElement('div');
                div.className = `meeting-chat-msg ${isMe ? 'me' : 'them'}`;
                // simple style injection
                div.style.background = isMe ? '#e6f7ff' : '#f0f0f0';
                div.style.padding = '8px';
                div.style.borderRadius = '8px';
                div.style.marginBottom = '8px';
                div.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
                div.style.maxWidth = '85%';
                div.style.fontSize = '0.9rem';

                div.innerHTML = `
                    <div style="word-break: break-word;">${escapeHtml(msg.content)}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <div style="font-size: 0.7rem; color: #888;">
                            ${window.KN.util.formatTime(msg.timestamp)}
                        </div>
                        ${isMe ? `<i class="fas fa-trash" style="font-size: 0.7rem; color: #ff6b6b; cursor: pointer; margin-left: 8px;" onclick="window.deleteMessage(${msg.id}, '${id}', '${type}')" title="Delete Message"></i>` : ''}
                    </div>
                `;
                chatElements.container.appendChild(div);
            });

            chatElements.container.scrollTop = chatElements.container.scrollHeight;
        } catch (e) {
            console.error("Chat load error", e);
        }
    }

    window.deleteMessage = async function (msgId, id, type) {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await window.KN.api.delete(`/messages/${msgId}`);
            alert("Message deleted successfully.");
            loadChatMessages(id, window.KN.auth.getUser().id, type);
        } catch (e) {
            console.error("Failed to delete message", e);
            alert("Could not delete message.");
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function startMeeting() {
        try {
            elements.joinBtn.disabled = true;
            elements.joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';

            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            elements.localVideo.srcObject = localStream;
            elements.localVideo.style.display = 'block';

            elements.videoPlaceholder.style.display = 'none';
            elements.status.textContent = "Live";
            elements.status.classList.add('status--live');

            // Enable controls
            elements.controlBtns.mute.disabled = false;
            elements.controlBtns.video.disabled = false;
            elements.controlBtns.screen.disabled = false;
            elements.controlBtns.leave.disabled = false;

            elements.joinBtn.style.display = 'none';

            // Connect to Signaling Server
            connectToSignaling();

        } catch (err) {
            console.error("Error accessing media devices.", err);
            alert("Could not access camera/microphone. Please allow permissions.");
            elements.joinBtn.disabled = false;
            elements.joinBtn.textContent = 'Join Meeting';
        }
    }

    function connectToSignaling() {
        // ... (rest of connectToSignaling with explicit log calls)

        // Derive host from API_BASE_URL or current location
        let host = window.KN.API_BASE_URL;

        // If relative URL (proxy), use window.location.host
        if (host.startsWith('/')) {
            host = window.location.host + host;
        } else {
            host = host.replace('http://', '').replace('https://', '');
        }

        if (host.endsWith('/')) host = host.slice(0, -1);

        // Determine protocol (ws or wss)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${host}/ws/meeting/${currentContext.id}`;
        console.log('Connecting to WS:', wsUrl);

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WS Connected');
            elements.status.textContent = "Waiting for peer...";
            ws.send(JSON.stringify({ type: 'join', sender: myId }));
        };

        ws.onmessage = async (event) => {
            const msg = JSON.parse(event.data);
            if (msg.sender === myId) return;

            console.log(`RX: ${msg.type} from ${msg.sender.substr(0, 4)}`);

            try {
                if (msg.type === 'join') {
                    console.log('Peer joined, creating offer...');
                    elements.status.textContent = "Peer joining...";
                    createPeerConnection(msg.sender, true);
                } else if (msg.type === 'offer') {
                    elements.status.textContent = "Peer connecting...";
                    await handleOffer(msg.offer, msg.sender);
                } else if (msg.type === 'answer') {
                    await handleAnswer(msg.answer, msg.sender);
                } else if (msg.type === 'ice-candidate') {
                    await handleCandidate(msg.candidate, msg.sender);
                }
            } catch (e) {
                console.error(`Error: ${e.message}`, e);
            }
        };

        ws.onerror = (e) => {
            console.error('WS Error');
            elements.status.textContent = "Connection Error";
            elements.status.style.color = 'red';
        };
        ws.onclose = () => {
            console.log('WS Closed');
            elements.status.textContent = "Disconnected";
        };
    }

    function createPeerConnection(peerId, initiator = false) {
        if (peerConnections[peerId]) return peerConnections[peerId];

        console.log('Creating PeerConnection for', peerId);
        const pc = new RTCPeerConnection(config);
        peerConnections[peerId] = pc;

        // Add local tracks
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        // Handle ICE
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                // log('Sending ICE candidate');
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate, sender: myId, target: peerId }));
                }
            }
        };

        // Handle Remote Stream
        pc.ontrack = (event) => {
            console.log('Received Remote Track!');
            addRemoteVideo(event.streams[0], peerId);
        };

        if (initiator) {
            createOffer(pc, peerId);
        }

        // Handle ICE Connection State
        pc.oniceconnectionstatechange = () => {
            console.log(`ICE State (${peerId}):`, pc.iceConnectionState);
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                // Handle disconnect
                removeRemoteVideo(peerId);
            }
            if (pc.iceConnectionState === 'connected') {
                console.log('ICE Connected!');
                elements.status.textContent = "Connected to Peer";
                elements.status.style.color = '#2ecc71'; // Green
            }
        };

        return pc;
    }

    function addRemoteVideo(stream, peerId) {
        // console.log("Adding remote video for " + peerId);
        let videoEl = document.getElementById(`video-${peerId}`);

        if (!videoEl) {
            const container = document.querySelector('.video-container');
            videoEl = document.createElement('video');
            videoEl.id = `video-${peerId}`;
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.className = 'video-element';

            // Explicit styles to ensure visibility over default CSS
            videoEl.style.display = 'block';
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'cover';

            // Layout: Remote = Background (First), Local = Overlay (Last)
            // ensuring remote is inserted before local video
            container.insertBefore(videoEl, elements.localVideo);

            // Force Local Video to be PiP
            // elements.localVideo.classList.remove('video-element'); // Don't remove base class!
            elements.localVideo.classList.add('pip');
            elements.localVideo.style.display = 'block'; // Ensure local is also visible

            // Add Name Label
            const label = document.createElement('div');
            label.className = 'video-name-label';
            label.textContent = window.currentPeerName || 'Participant';
            label.id = `label-${peerId}`;
            container.appendChild(label);
        }

        videoEl.srcObject = stream;

        // Final safety check for playback
        videoEl.onloadedmetadata = () => {
            videoEl.play().catch(e => console.error("Remote play error", e));
        };
    }

    function removeRemoteVideo(peerId) {
        const el = document.getElementById(`video-${peerId}`);
        if (el) el.remove();

        const label = document.getElementById(`label-${peerId}`);
        if (label) label.remove();

        // Revert Local Video to Full
        elements.localVideo.classList.remove('pip');

        if (elements.status.textContent === "Connected to Peer") {
            elements.status.textContent = "Live (Waiting for peer...)";
            elements.status.style.color = '';
        }
    }

    async function handleOffer(offer, peerId) {
        // console.log('Handling Offer from ' + peerId);
        const pc = createPeerConnection(peerId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush buffered candidates
        if (iceCandidateQueue[peerId]) {
            for (const candidate of iceCandidateQueue[peerId]) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding buffered candidate", e);
                }
            }
            delete iceCandidateQueue[peerId];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'answer', answer: answer, sender: myId, target: peerId }));
        }
    }

    async function handleAnswer(answer, peerId) {
        // console.log('Handling Answer from ' + peerId);
        const pc = peerConnections[peerId];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            // Flush buffered candidates
            if (iceCandidateQueue[peerId]) {
                for (const candidate of iceCandidateQueue[peerId]) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error("Error adding buffered candidate", e);
                    }
                }
                delete iceCandidateQueue[peerId];
            }
        }
    }

    async function handleCandidate(candidate, peerId) {
        const pc = peerConnections[peerId];
        // Only add candidate if remote description is set
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error("Error adding ICE candidate", e);
            }
        } else {
            // Buffer it
            if (!iceCandidateQueue[peerId]) iceCandidateQueue[peerId] = [];
            iceCandidateQueue[peerId].push(candidate);
        }
    }

    async function createOffer(pc, peerId) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'offer', offer: offer, sender: myId, target: peerId }));
        }
    }

    function endMeeting() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (ws) {
            ws.close();
            ws = null;
        }
        Object.values(peerConnections).forEach(pc => pc.close());
        peerConnections = {};

        // Remove remote videos
        document.querySelectorAll('.remote-video').forEach(el => el.remove());

        elements.localVideo.srcObject = null;
        elements.videoPlaceholder.style.display = 'flex';
        elements.joinBtn.style.display = 'inline-flex';
        elements.joinBtn.disabled = false;
        elements.joinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Meeting';

        elements.status.textContent = "Ended";
        elements.status.classList.remove('status--live');

        // Disable controls
        elements.controlBtns.mute.disabled = true;
        elements.controlBtns.video.disabled = true;
        elements.controlBtns.screen.disabled = true;
        elements.controlBtns.leave.disabled = true;
    }

    function toggleMute() {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const icon = elements.controlBtns.mute.querySelector('i');
                if (audioTrack.enabled) {
                    icon.className = 'fas fa-microphone';
                    elements.controlBtns.mute.classList.remove('active');
                } else {
                    icon.className = 'fas fa-microphone-slash';
                    elements.controlBtns.mute.classList.add('active');
                }
            }
        }
    }

    function updateParticipantsList(users) {
        const list = document.getElementById('participantsList');
        const countSpan = document.getElementById('participantCount');
        if (!list) return;

        if (countSpan) countSpan.textContent = `(${users.length})`;

        list.innerHTML = '';
        users.forEach(u => {
            const div = document.createElement('div');
            div.className = 'participant';
            div.innerHTML = `
                <div class="participant-avatar" style="${u.avatar_url ? 'padding:0;overflow:hidden;' : ''}">
                    ${u.avatar_url ? `<img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : (u.name ? u.name.charAt(0).toUpperCase() : '?')}
                </div>
                <div class="participant-info">
                    <div class="participant-name">${u.name || 'User'} ${u.id === window.KN.auth.getUser().id ? '(You)' : ''}</div>
                    <div class="participant-role">Participant</div>
                </div>
                <div class="participant-status">
                     <div class="status-indicator"></div>
                </div>
            `;
            list.appendChild(div);
        });
    }

    function toggleVideo() {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const icon = elements.controlBtns.video.querySelector('i');
                if (videoTrack.enabled) {
                    icon.className = 'fas fa-video';
                    elements.controlBtns.video.classList.remove('active');
                } else {
                    icon.className = 'fas fa-video-slash';
                    elements.controlBtns.video.classList.add('active');
                }
            }
        }
    }

});
