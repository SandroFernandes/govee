import React from "react";
import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import "./AppDrawer.css";

export default function AppDrawer({
  drawerOpen,
  mobileOpen,
  setMobileOpen,
  menuItems,
  authState,
  activeMenu,
  handleMenuClick,
}) {
  const drawerStateClass = drawerOpen ? "drawer-open" : "drawer-closed";

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
              className={`app-drawer-list-item ${drawerStateClass}`}
            >
              <ListItemIcon className={`app-drawer-list-item-icon ${drawerStateClass}`}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} className={`app-drawer-list-item-text ${drawerStateClass}`} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box component="nav" className={`app-drawer-nav ${drawerStateClass}`}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        className="app-drawer-mobile"
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        className={`app-drawer-desktop ${drawerStateClass}`}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
}
