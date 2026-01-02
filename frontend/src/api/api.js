import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";
// console.log("API BASE_URL:", BASE_URL); // Debugging
const TOKEN_KEY = "knownet_token";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status, response.data);
    return response;
  },
  (error) => {
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export const authApi = {
  async login(payload) {
    const { data } = await api.post("/auth/login", payload);
    return data;
  },
  async register(payload) {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },
  async me() {
    const { data } = await api.get("/auth/me");
    return data;
  },
};

export const sessionApi = {
  async list(params = {}) {
    const { data } = await api.get("/sessions", { params });
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/sessions", payload);
    return data;
  },
  async getById(sessionId) {
    const { data } = await api.get(`/sessions/${sessionId}`);
    return data;
  },
  async join(sessionId) {
    const { data } = await api.post(`/sessions/${sessionId}/join`);
    return data;
  },
};

export const recordingApi = {
  async upload(sessionId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`/sessions/${sessionId}/recordings`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  async get(sessionId) {
    const { data } = await api.get(`/sessions/${sessionId}/recordings`);
    return data;
  },
};

export const attendanceApi = {
  async list(sessionId) {
    const { data } = await api.get(`/attendance/${sessionId}`);
    return data;
  },
};

export const messageApi = {
  async list(sessionId) {
    const { data } = await api.get(`/messages/${sessionId}/messages`);
    return data;
  },
  async send(sessionId, payload) {
    const { data } = await api.post(`/messages/${sessionId}/messages`, payload);
    return data;
  },
  async listConnection(connectionId) {
    const { data } = await api.get(`/messages/connection/${connectionId}`);
    return data;
  },
  async sendConnection(connectionId, payload) {
    const { data } = await api.post(`/messages/connection/${connectionId}`, payload);
    return data;
  },
};

export const resourceApi = {
  async list(sessionId) {
    const { data } = await api.get(`/resources/${sessionId}/resources`);
    return data;
  },
  async upload(sessionId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`/resources/${sessionId}/resources`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const connectionApi = {
  async request(receiverId) {
    const { data } = await api.post(`/connect/request/${receiverId}`);
    return data;
  },
  async accept(connectionId) {
    const { data } = await api.post(`/connect/accept/${connectionId}`);
    return data;
  },
  async reject(connectionId) {
    await api.delete(`/connect/reject/${connectionId}`);
  },
  async check() {
    const { data } = await api.get("/connect/check");
    return data;
  },
  async listRequests() {
    const { data } = await api.get("/connect/requests");
    return data;
  },
  async listActive() {
    const { data } = await api.get("/connect");
    return data;
  },
};

export const meetingApi = {
  async upload(connectionId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`/meeting/upload/${connectionId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  async listRecordings(connectionId) {
    const { data } = await api.get(`/meeting/recordings/${connectionId}`);
    return data;
  },
};

export const recommendationApi = {
  async location() {
    const { data } = await api.get("/recommendations/location");
    return data;
  },
};

export const dashboardApi = {
  async getOverview() {
    const { data } = await api.get("/dashboard/overview");
    return data;
  },
  async search(query) {
    const { data } = await api.get(`/dashboard/search?q=${encodeURIComponent(query)}`);
    return data;
  },
};

export const profileApi = {
  async updateDetails(payload) {
    const { data } = await api.put("/profile/details", payload);
    return data;
  },
};

const NOTES_KEY_PREFIX = "knownet_notes";

export const notesApi = {
  _key(userId) {
    return `${NOTES_KEY_PREFIX}_${userId}`;
  },
  list(userId) {
    const raw = localStorage.getItem(this._key(userId));
    return raw ? JSON.parse(raw) : [];
  },
  save(userId, notes) {
    localStorage.setItem(this._key(userId), JSON.stringify(notes));
    return notes;
  },
  create(userId, note) {
    const notes = this.list(userId);
    const newNote = { ...note, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    notes.push(newNote);
    return this.save(userId, notes);
  },
  update(userId, noteId, updates) {
    const notes = this.list(userId);
    const next = notes.map((note) => (note.id === noteId ? { ...note, ...updates } : note));
    return this.save(userId, next);
  },
  remove(userId, noteId) {
    const next = this.list(userId).filter((note) => note.id !== noteId);
    return this.save(userId, next);
  },
};

export const storageKeys = {
  TOKEN: TOKEN_KEY,
  USER: "knownet_user",
};

