const API_URL = "http://localhost:5000/auth";

// Login with username OR email
export async function loginUser(loginInput, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: loginInput, password }),
  });
  return res.json();
}

// Register new user with username + email + password
export async function registerUser(username, email, password) {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
}
