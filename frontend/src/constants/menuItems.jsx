import React from "react";
import AboutIcon from "@mui/icons-material/InfoOutlined";
import DevicesIcon from "@mui/icons-material/MemoryOutlined";
import HistoryIcon from "@mui/icons-material/ShowChartOutlined";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";

export const menuItems = [
  { key: "history", label: "Historical Data", icon: <HistoryIcon /> },
  { key: "devices", label: "Device Names", icon: <DevicesIcon /> },
  { key: "login", label: "Login", icon: <LoginIcon /> },
  { key: "logout", label: "Logout", icon: <LogoutIcon /> },
  { key: "about", label: "About", icon: <AboutIcon /> },
];

export const drawerWidth = 280;
export const drawerCollapsedWidth = 72;
