const API_BASE = "/api";

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export async function api(url, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? authHeaders(token) : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
