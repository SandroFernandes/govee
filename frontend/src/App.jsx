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
import "./App.css";
import AboutSection from "./components/AboutSection";
import AppDrawer from "./components/AppDrawer";
import AppHeader from "./components/AppHeader";
import DevicesSection from "./components/DevicesSection";
import HistorySection from "./components/HistorySection";
import LoginSection from "./components/LoginSection";
import { menuItems } from "./constants/menuItems";
import useAuth from "./hooks/useAuth";
import useDevicesData from "./hooks/useDevicesData";
import useHealthStatus from "./hooks/useHealthStatus";
import useHistoryData from "./hooks/useHistoryData";

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("history");
  const [historyInterval, setHistoryInterval] = useState("days");
  const [historyAddress, setHistoryAddress] = useState("");
  const [themeMode, setThemeMode] = useState("system");
  const [snack, setSnack] = useState({ open: false, message: "" });

  function showMessage(message) {
    setSnack({ open: true, message });
  }

  const status = useHealthStatus();
  const historyState = useHistoryData(historyInterval, historyAddress);
  const { devicesState, aliasInputs, setAliasInputs, savingState, saveAlias } = useDevicesData(showMessage);
  const { authState, loginForm, setLoginForm, showPassword, setShowPassword, submitLogin, performLogout } = useAuth(showMessage, setActiveMenu);

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
    if (!devicesState.devices.length) {
      setHistoryAddress("");
      return;
    }

    const selectedExists = devicesState.devices.some((device) => device.address === historyAddress);
    if (!selectedExists) {
      setHistoryAddress(devicesState.devices[0].address);
    }
  }, [devicesState.devices, historyAddress]);

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
  return (
    <ThemeProvider theme={theme}>
      <Box className={`app-shell ${drawerOpen ? "drawer-open" : "drawer-closed"}`}>
        <CssBaseline />
        <AppHeader
          drawerOpen={drawerOpen}
          toggleDrawer={toggleDrawer}
          themeMode={themeMode}
          themeAriaLabel={themeAriaLabel}
          themeIcon={themeIcon}
          cycleThemeMode={cycleThemeMode}
          status={status}
          healthAria={healthAria}
        />

        <AppDrawer
          drawerOpen={drawerOpen}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          menuItems={menuItems}
          authState={authState}
          activeMenu={activeMenu}
          handleMenuClick={handleMenuClick}
        />

        <Box component="main" className="app-main">
          <Toolbar />

          {activeMenu === "history" && (
            <HistorySection
              historyState={historyState}
              historyInterval={historyInterval}
              setHistoryInterval={setHistoryInterval}
              historyAddress={historyAddress}
              setHistoryAddress={setHistoryAddress}
              devices={devicesState.devices}
            />
          )}

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
            />
          )}

          {activeMenu === "about" && <AboutSection />}
        </Box>
        <Snackbar open={snack.open} autoHideDuration={2500} onClose={() => setSnack({ open: false, message: "" })} message={snack.message} />
      </Box>
    </ThemeProvider>
  );
}
