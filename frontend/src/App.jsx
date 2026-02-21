import React from "react";
import { useEffect, useState } from "react";
import AboutIcon from "@mui/icons-material/InfoOutlined";
import AutoModeIcon from "@mui/icons-material/BrightnessAuto";
import CircleIcon from "@mui/icons-material/Circle";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DevicesIcon from "@mui/icons-material/MemoryOutlined";
import HistoryIcon from "@mui/icons-material/ShowChartOutlined";
import LightModeIcon from "@mui/icons-material/LightMode";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  Input,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const drawerWidth = 280;
const drawerCollapsedWidth = 72;

const menuItems = [
  { key: "history", label: "Historical Data", icon: <HistoryIcon /> },
  { key: "devices", label: "Device Names", icon: <DevicesIcon /> },
  { key: "login", label: "Login", icon: <LoginIcon /> },
  { key: "logout", label: "Logout", icon: <LogoutIcon /> },
  { key: "about", label: "About", icon: <AboutIcon /> },
];

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
  const [snack, setSnack] = useState({ open: false, message: "" });

  function showMessage(message) {
    setSnack({ open: true, message });
  }

  function handleMenuClick(key) {
    if (!authState.loggedIn && key !== "login") {
      setActiveMenu("login");
      setMobileOpen(false);
      return;
    }

    if (key === "logout") {
      setAuthState({ loggedIn: false, username: "" });
      setLoginForm({ username: "", password: "" });
      setActiveMenu("login");
      showMessage("Logged out");
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

  function submitLogin(event) {
    event.preventDefault();
    const username = loginForm.username.trim();
    if (!username || !loginForm.password) {
      showMessage("Enter username and password");
      return;
    }

    setAuthState({ loggedIn: true, username });
    setLoginForm({ username: "", password: "" });
    showMessage(`Logged in as ${username}`);
    setActiveMenu("history");
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

  const drawer = (
    <Box>
      <Toolbar>{drawerOpen && <Typography variant="h6">Govee Dashboard</Typography>}</Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isEnabled = authState.loggedIn || item.key === "login";
          return (
          <ListItemButton
            key={item.key}
            aria-label={item.label}
            disabled={!isEnabled}
            selected={activeMenu === item.key}
            onClick={() => handleMenuClick(item.key)}
            sx={{ minHeight: 48, justifyContent: drawerOpen ? "initial" : "center", px: 2.5 }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: drawerOpen ? 2 : "auto", justifyContent: "center" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} sx={{ opacity: drawerOpen ? 1 : 0 }} />
          </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : drawerCollapsedWidth}px)` },
            ml: { sm: `${drawerOpen ? drawerWidth : drawerCollapsedWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
              Govee Frontend
            </Typography>
            <Tooltip title={`Theme: ${themeMode}`}>
              <IconButton color="inherit" onClick={cycleThemeMode} aria-label={themeAriaLabel} sx={{ mr: 1 }}>
                {themeIcon}
              </IconButton>
            </Tooltip>
            <Tooltip title={`Backend: ${status}`}>
              <CircleIcon fontSize="small" sx={{ color: healthColor }} aria-label={healthAria} />
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="nav" sx={{ width: { sm: drawerOpen ? drawerWidth : drawerCollapsedWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", sm: "none" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerOpen ? drawerWidth : drawerCollapsedWidth,
              overflowX: "hidden",
              transition: (theme) =>
                theme.transitions.create("width", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
          open
        >
          {drawer}
        </Drawer>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : drawerCollapsedWidth}px)` } }}>
        <Toolbar />

        {activeMenu === "history" && (
          <Stack spacing={2}>
            <Typography variant="h5">Historical Data</Typography>
            {historyState.loading && <Typography>Loading history…</Typography>}
            {!historyState.loading && historyState.error && <Typography>History: {historyState.error}</Typography>}
            {!historyState.loading && !historyState.error && historyState.points.length === 0 && <Typography>No history data yet.</Typography>}
            {!historyState.loading && !historyState.error && historyState.points.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography>Points: {historyState.points.length}</Typography>
                <Box sx={{ mt: 1 }}>
                  <svg viewBox="0 0 700 240" role="img" aria-label="Temperature and humidity history chart">
                    <polyline points={chart.temperatureLine} fill="none" stroke="#cc2936" strokeWidth="2" />
                    <polyline points={chart.humidityLine} fill="none" stroke="#1f77b4" strokeWidth="2" />
                  </svg>
                </Box>
                <Typography>Temp range: {chart.tempMin.toFixed(1)}°C → {chart.tempMax.toFixed(1)}°C</Typography>
                <Typography>Humidity range: {chart.humidityMin.toFixed(1)}% → {chart.humidityMax.toFixed(1)}%</Typography>
              </Paper>
            )}
          </Stack>
        )}

        {activeMenu === "devices" && (
          <Stack spacing={2}>
            <Typography variant="h5">Device Names</Typography>
            {devicesState.loading && <Typography>Loading devices…</Typography>}
            {!devicesState.loading && devicesState.error && <Typography>Devices: {devicesState.error}</Typography>}
            {!devicesState.loading && !devicesState.error && devicesState.devices.length === 0 && (
              <Typography>No devices yet. Run a read command first.</Typography>
            )}
            {!devicesState.loading && !devicesState.error && devicesState.devices.length > 0 && (
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>MAC</TableCell>
                      <TableCell>Alias</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {devicesState.devices.map((device) => (
                      <TableRow key={device.address}>
                        <TableCell>{device.display_name || device.detected_name || device.address}</TableCell>
                        <TableCell>{device.address}</TableCell>
                        <TableCell>
                          <Input
                            inputProps={{ "aria-label": `alias-${device.address}` }}
                            value={aliasInputs[device.address] ?? ""}
                            onChange={(event) =>
                              setAliasInputs((previous) => ({
                                ...previous,
                                [device.address]: event.target.value,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="contained" onClick={() => saveAlias(device.address)}>
                            Save
                          </Button>
                          {savingState[device.address] === "saving" && <Typography component="span"> saving…</Typography>}
                          {savingState[device.address] === "saved" && <Typography component="span"> saved</Typography>}
                          {savingState[device.address] === "error" && <Typography component="span"> error</Typography>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Stack>
        )}

        {activeMenu === "login" && (
          <Stack spacing={2} component="form" onSubmit={submitLogin} sx={{ maxWidth: 420 }}>
            <Typography variant="h5">Login</Typography>
            {authState.loggedIn ? (
              <Typography>You are logged in as {authState.username}.</Typography>
            ) : (
              <>
                <TextField
                  label="Username"
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                />
                <TextField
                  type="password"
                  label="Password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                <Button type="submit" variant="contained" aria-label="login-submit">
                  Login
                </Button>
              </>
            )}
          </Stack>
        )}

        {activeMenu === "about" && (
          <Stack spacing={1}>
            <Typography variant="h5">About</Typography>
            <Typography>Govee dashboard for historical temperature and humidity data.</Typography>
            <Typography>Use the Device Names section to assign human-friendly names.</Typography>
          </Stack>
        )}
        </Box>
        <Snackbar open={snack.open} autoHideDuration={2500} onClose={() => setSnack({ open: false, message: "" })} message={snack.message} />
      </Box>
    </ThemeProvider>
  );
}

function buildChart(points) {
  const width = 700;
  const height = 240;
  const padding = 16;

  if (!points.length) {
    return {
      temperatureLine: "",
      humidityLine: "",
      tempMin: 0,
      tempMax: 0,
      humidityMin: 0,
      humidityMax: 0,
    };
  }

  const temperatures = points.map((point) => Number(point.temperature_c));
  const humidities = points.map((point) => Number(point.humidity_pct));

  const tempMin = Math.min(...temperatures);
  const tempMax = Math.max(...temperatures);
  const humidityMin = Math.min(...humidities);
  const humidityMax = Math.max(...humidities);

  const xForIndex = (index) => {
    if (points.length === 1) {
      return width / 2;
    }
    const ratio = index / (points.length - 1);
    return padding + ratio * (width - padding * 2);
  };

  const yForValue = (value, min, max) => {
    if (max === min) {
      return height / 2;
    }
    const ratio = (value - min) / (max - min);
    return height - padding - ratio * (height - padding * 2);
  };

  const temperatureLine = points
    .map((point, index) => `${xForIndex(index)},${yForValue(Number(point.temperature_c), tempMin, tempMax)}`)
    .join(" ");

  const humidityLine = points
    .map((point, index) => `${xForIndex(index)},${yForValue(Number(point.humidity_pct), humidityMin, humidityMax)}`)
    .join(" ");

  return {
    temperatureLine,
    humidityLine,
    tempMin,
    tempMax,
    humidityMin,
    humidityMax,
  };
}
