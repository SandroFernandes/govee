import React from "react";
import CircleIcon from "@mui/icons-material/Circle";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";

export default function AppHeader({
  drawerOpen,
  drawerWidth,
  drawerCollapsedWidth,
  toggleDrawer,
  themeMode,
  themeAriaLabel,
  themeIcon,
  cycleThemeMode,
  status,
  healthColor,
  healthAria,
}) {
  return (
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
  );
}
