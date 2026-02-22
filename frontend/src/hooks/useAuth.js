import { useEffect, useState } from "react";

function readCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift() || "";
  }
  return "";
}

export default function useAuth(showMessage, setActiveMenu) {
  const [authState, setAuthState] = useState({ loggedIn: false, username: "" });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthSession() {
      try {
        const response = await fetch("/api/auth/session/", { credentials: "include" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!isMounted) {
          return;
        }

        if (data.logged_in) {
          setAuthState({ loggedIn: true, username: data.username || "" });
          setActiveMenu((current) => (current === "login" ? "history" : current));
        } else {
          setAuthState({ loggedIn: false, username: "" });
          setActiveMenu("login");
        }
      } catch {
        if (!isMounted) {
          return;
        }
        setAuthState({ loggedIn: false, username: "" });
        setActiveMenu("login");
      }
    }

    loadAuthSession();

    return () => {
      isMounted = false;
    };
  }, [setActiveMenu]);

  async function ensureCsrfToken() {
    const existing = readCookie("csrftoken");
    if (existing) {
      return existing;
    }

    const response = await fetch("/api/auth/csrf/", { credentials: "include" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    const token = readCookie("csrftoken");
    if (token) {
      return token;
    }

    if (payload?.csrfToken) {
      return String(payload.csrfToken);
    }

    throw new Error("missing-csrf-token");
  }

  async function performLogout() {
    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch("/api/auth/logout/", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": csrfToken },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setAuthState({ loggedIn: false, username: "" });
      setLoginForm({ username: "", password: "" });
      setShowPassword(false);
      setActiveMenu("login");
      showMessage("Logged out");
    } catch {
      showMessage("Logout failed");
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    const username = loginForm.username.trim();
    if (!username || !loginForm.password) {
      showMessage("Enter username and password");
      return;
    }

    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ username, password: loginForm.password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          showMessage("Invalid username or password");
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAuthState({ loggedIn: Boolean(data.logged_in), username: data.username || "" });
      setLoginForm({ username: "", password: "" });
      setShowPassword(false);
      showMessage(`Logged in as ${data.username || username}`);
      setActiveMenu("history");
    } catch {
      showMessage("Login failed");
    }
  }

  return {
    authState,
    loginForm,
    setLoginForm,
    showPassword,
    setShowPassword,
    submitLogin,
    performLogout,
  };
}
