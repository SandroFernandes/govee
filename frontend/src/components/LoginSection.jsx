import React from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";

export default function LoginSection({ authState, loginForm, setLoginForm, submitLogin, showPassword, setShowPassword, loginFieldSx }) {
  return (
    <Box sx={{ minHeight: "calc(100vh - 112px)", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Stack spacing={2} component="form" onSubmit={submitLogin} sx={{ width: "100%", maxWidth: 420 }}>
        <Typography variant="h5">Login</Typography>
        {authState.loggedIn ? (
          <Typography>You are logged in as {authState.username}.</Typography>
        ) : (
          <>
            <TextField
              label="Username"
              value={loginForm.username}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
              sx={loginFieldSx}
            />
            <TextField
              type={showPassword ? "text" : "password"}
              label="Password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              sx={loginFieldSx}
              InputProps={{
                sx: {
                  "& .MuiInputAdornment-root": {
                    backgroundColor: "primary.main",
                  },
                  "& .MuiIconButton-root": {
                    color: "common.white",
                    backgroundColor: "primary.main",
                    borderRadius: 0,
                    "&:hover": {
                      backgroundColor: "primary.main",
                    },
                  },
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      aria-label={showPassword ? "hide-password" : "show-password"}
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" aria-label="login-submit">
              Login
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
