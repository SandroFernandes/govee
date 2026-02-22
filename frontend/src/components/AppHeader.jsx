import React from "react";
import CircleIcon from "@mui/icons-material/Circle";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";
import "./AppHeader.css";

export default function AppHeader({
  drawerOpen,
  toggleDrawer,
  themeMode,
  themeAriaLabel,
  themeIcon,
  cycleThemeMode,
  status,
  healthAria,
}) {
  const healthClassName = status === "ok" ? "health-ok" : status === "unreachable" ? "health-unreachable" : "health-checking";

  return (
    <AppBar position="fixed" className={`app-header ${drawerOpen ? "app-header-open" : "app-header-closed"}`}>
      <Toolbar>
        <IconButton color="inherit" edge="start" onClick={toggleDrawer} className="app-header-menu-button">
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap className="app-header-title">
          Govee Frontend
        </Typography>
        <Tooltip title={`Theme: ${themeMode}`}>
          <IconButton color="inherit" onClick={cycleThemeMode} aria-label={themeAriaLabel} className="app-header-theme-button">
            {themeIcon}
          </IconButton>
        </Tooltip>
        <Tooltip title={`Backend: ${status}`}>
          <CircleIcon fontSize="small" className={`app-header-health-icon ${healthClassName}`} aria-label={healthAria} />
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
