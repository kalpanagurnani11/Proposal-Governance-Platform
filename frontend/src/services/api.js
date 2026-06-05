const API_BASE_URL = 'http://localhost:5031/api';

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  get: async (endpoint) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GET Request failed with status ${res.status}`);
    }
    return res.json();
  },

  post: async (endpoint, data) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `POST Request failed with status ${res.status}`);
    }
    return res.json();
  },

  put: async (endpoint, data) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `PUT Request failed with status ${res.status}`);
    }
    return res.json();
  },

  // Upload file requires special handling (multipart/form-data, no content-type header so browser boundary works)
  upload: async (endpoint, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },

  downloadUrl: (filePath) => {
    return `${API_BASE_URL}/files/download?filePath=${encodeURIComponent(filePath)}&access_token=${localStorage.getItem('token')}`;
  }
};
