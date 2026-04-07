const AUTH_STORAGE_KEY = "tp_auth_session";
const API_BASE = "/api/auth";

async function browserPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    return { success: false, error: data.error || "Wrong email or password" };
  }
  return data;
}

export async function login(email, password) {
  const result = await browserPost("/login", { email, password });
  if (result.success) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.user));
  }
  return result;
}

export async function logout() {
  if (typeof window === "undefined") return { success: true };
  localStorage.removeItem(AUTH_STORAGE_KEY);
  await browserPost("/logout", {});
  return { success: true };
}

export async function isAuthenticated() {
  if (typeof window === "undefined") {
    return { authenticated: false, user: null };
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return { authenticated: false, user: null };

  try {
    const user = JSON.parse(raw);
    if (!user?.email) return { authenticated: false, user: null };
    return { authenticated: true, user };
  } catch {
    return { authenticated: false, user: null };
  }
}
