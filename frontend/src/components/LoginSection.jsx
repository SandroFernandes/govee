import React from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import "./LoginSection.css";

export default function LoginSection({ authState, loginForm, setLoginForm, submitLogin, showPassword, setShowPassword }) {
  return (
    <Box className="login-section">
      <Stack spacing={2} component="form" onSubmit={submitLogin} className="login-form">
        <Typography variant="h5">Login</Typography>
        {authState.loggedIn ? (
          <Typography>You are logged in as {authState.username}.</Typography>
        ) : (
          <>
            <TextField
              label="Username"
              value={loginForm.username}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
              className="login-field"
            />
            <TextField
              type={showPassword ? "text" : "password"}
              label="Password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              className="login-field login-password-field"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end" className="login-password-adornment">
                    <IconButton
                      edge="end"
                      aria-label={showPassword ? "hide-password" : "show-password"}
                      onClick={() => setShowPassword((current) => !current)}
                      className="login-password-toggle"
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
