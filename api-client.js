(() => {
  const configured = window.MEDIBRIDGE_API_URL || "http://localhost:5000/api";
  const baseUrl = configured.replace(/\/$/, "");
  const tokenKey = "mb_token";
  const userKey = "mb_user";

  function clearSession() {
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(userKey);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    localStorage.removeItem("mb_role");
  }

  async function request(path, options = {}) {
    const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
    const headers = { ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
    if (token && options.auth !== false) headers.Authorization = `Bearer ${token}`;
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
    } catch (_) {
      const error = new Error("Could not connect to MediBridge. Check that the server is running.");
      error.network = true;
      throw error;
    }
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && options.auth !== false) {
      clearSession();
      if (typeof window.handleExpiredSession === "function") window.handleExpiredSession();
    }
    if (!response.ok) {
      const error = new Error(data.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  window.MediBridgeAPI = {
    baseUrl,
    clearSession,
    get: path => request(path),
    post: (path, body, headers = {}) => request(path, { method: "POST", body, headers }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    delete: path => request(path, { method: "DELETE" }),
    publicPost: (path, body) => request(path, { method: "POST", body, auth: false })
  };
})();
