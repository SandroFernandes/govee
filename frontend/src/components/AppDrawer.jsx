import React from "react";
import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";

export default function AppDrawer({
  drawerOpen,
  drawerWidth,
  drawerCollapsedWidth,
  mobileOpen,
  setMobileOpen,
  menuItems,
  authState,
  activeMenu,
  handleMenuClick,
}) {
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
  );
}
