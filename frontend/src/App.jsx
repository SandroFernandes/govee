import React from "react";
import { useEffect, useState } from "react";
import AutoModeIcon from "@mui/icons-material/BrightnessAuto";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import {
  Box,
  CssBaseline,
  Snackbar,
  Toolbar,
  useMediaQuery,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import AboutSection from "./components/AboutSection";
import AppDrawer from "./components/AppDrawer";
import AppHeader from "./components/AppHeader";
import DevicesSection from "./components/DevicesSection";
import HistorySection from "./components/HistorySection";
import LoginSection from "./components/LoginSection";
import { drawerCollapsedWidth, drawerWidth, menuItems } from "./constants/menuItems";
import { buildChart } from "./utils/chart";

function readCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift() || "";
  }
  return "";
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("history");
  const [status, setStatus] = useState("checking...");
  const [themeMode, setThemeMode] = useState("system");
  const [historyState, setHistoryState] = useState({ loading: true, error: "", points: [] });
  const [devicesState, setDevicesState] = useState({ loading: true, error: "", devices: [] });
  const [aliasInputs, setAliasInputs] = useState({});
  const [savingState, setSavingState] = useState({});
  const [authState, setAuthState] = useState({ loggedIn: false, username: "" });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "" });

  function showMessage(message) {
    setSnack({ open: true, message });
  }

  async function handleMenuClick(key) {
    if (!authState.loggedIn && key !== "login") {
      setActiveMenu("login");
      setMobileOpen(false);
      return;
    }

    if (key === "logout") {
      await performLogout();
    } else {
      setActiveMenu(key);
    }
    setMobileOpen(false);
  }

  function toggleDrawer() {
    setDrawerOpen((open) => !open);
    setMobileOpen((open) => !open);
  }

  useEffect(() => {
    if (!authState.loggedIn && activeMenu !== "login") {
      setActiveMenu("login");
    }
  }, [authState.loggedIn, activeMenu]);

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
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const response = await fetch("/api/health/");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setStatus(data.status || "unknown");
        }
      } catch {
        if (isMounted) {
          setStatus("unreachable");
        }
      }
    }

    loadHealth();

    const timerId = setInterval(loadHealth, 5000);

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDevices() {
      try {
        const response = await fetch("/api/devices/");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const devices = Array.isArray(data.devices) ? data.devices : [];
        if (isMounted) {
          setDevicesState({ loading: false, error: "", devices });
          setAliasInputs((previous) => {
            const next = { ...previous };
            for (const device of devices) {
              if (typeof next[device.address] !== "string") {
                next[device.address] = device.alias || "";
              }
            }
            return next;
          });
        }
      } catch {
        if (isMounted) {
          setDevicesState({ loading: false, error: "devices-unreachable", devices: [] });
        }
      }
    }

    loadDevices();
    const timerId = setInterval(loadDevices, 60000);

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, []);

  async function saveAlias(address) {
    const alias = (aliasInputs[address] || "").trim();
    setSavingState((previous) => ({ ...previous, [address]: "saving" }));

    try {
      const response = await fetch("/api/devices/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, alias }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const updated = await response.json();
      setDevicesState((previous) => ({
        ...previous,
        devices: previous.devices.map((device) =>
          device.address === address
            ? {
                ...device,
                alias: updated.alias,
                detected_name: updated.detected_name,
                display_name: updated.display_name,
                updated_at: updated.updated_at,
              }
            : device
        ),
      }));
      setSavingState((previous) => ({ ...previous, [address]: "saved" }));
      showMessage("Alias saved");
    } catch {
      setSavingState((previous) => ({ ...previous, [address]: "error" }));
      showMessage("Alias save failed");
    }
  }

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

    if (!token) {
      throw new Error("missing-csrf-token");
    }
    return token;
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

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const response = await fetch("/api/history/?hours=168&limit=1000");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          setHistoryState({
            loading: false,
            error: "",
            points: Array.isArray(data.points) ? data.points : [],
          });
        }
      } catch {
        if (isMounted) {
          setHistoryState({ loading: false, error: "history-unreachable", points: [] });
        }
      }
    }

    loadHistory();
    const timerId = setInterval(loadHistory, 60000);

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, []);

  const chart = buildChart(historyState.points);
  const healthColor = status === "ok" ? "success.main" : status === "unreachable" ? "error.main" : "warning.main";
  const healthAria = status === "ok" ? "backend-status-ok" : status === "unreachable" ? "backend-status-unreachable" : "backend-status-checking";
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const effectiveThemeMode = themeMode === "system" ? (prefersDarkMode ? "dark" : "light") : themeMode;
  const theme = createTheme({
    palette: {
      mode: effectiveThemeMode,
    },
  });

  function cycleThemeMode() {
    setThemeMode((current) => {
      if (current === "system") {
        return "light";
      }
      if (current === "light") {
        return "dark";
      }
      return "system";
    });
  }

  const themeIcon = themeMode === "system" ? <AutoModeIcon fontSize="small" /> : themeMode === "light" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />;
  const themeAriaLabel = `theme-mode-${themeMode}`;
  const loginFieldSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "primary.main",
      color: "common.white",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "primary.light",
    },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "primary.light",
    },
    "& .MuiInputLabel-root": {
      color: "text.secondary",
    },
    "& .MuiSvgIcon-root": {
      color: "common.white",
    },
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppHeader
          drawerOpen={drawerOpen}
          drawerWidth={drawerWidth}
          drawerCollapsedWidth={drawerCollapsedWidth}
          toggleDrawer={toggleDrawer}
          themeMode={themeMode}
          themeAriaLabel={themeAriaLabel}
          themeIcon={themeIcon}
          cycleThemeMode={cycleThemeMode}
          status={status}
          healthColor={healthColor}
          healthAria={healthAria}
        />

        <AppDrawer
          drawerOpen={drawerOpen}
          drawerWidth={drawerWidth}
          drawerCollapsedWidth={drawerCollapsedWidth}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          menuItems={menuItems}
          authState={authState}
          activeMenu={activeMenu}
          handleMenuClick={handleMenuClick}
        />

        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : drawerCollapsedWidth}px)` } }}>
          <Toolbar />

          {activeMenu === "history" && <HistorySection historyState={historyState} chart={chart} />}

          {activeMenu === "devices" && (
            <DevicesSection
              devicesState={devicesState}
              aliasInputs={aliasInputs}
              setAliasInputs={setAliasInputs}
              saveAlias={saveAlias}
              savingState={savingState}
            />
          )}

          {activeMenu === "login" && (
            <LoginSection
              authState={authState}
              loginForm={loginForm}
              setLoginForm={setLoginForm}
              submitLogin={submitLogin}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              loginFieldSx={loginFieldSx}
            />
          )}

          {activeMenu === "about" && <AboutSection />}
        </Box>
        <Snackbar open={snack.open} autoHideDuration={2500} onClose={() => setSnack({ open: false, message: "" })} message={snack.message} />
      </Box>
    </ThemeProvider>
  );
}
