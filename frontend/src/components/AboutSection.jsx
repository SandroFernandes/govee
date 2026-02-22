import React from "react";
import { Stack, Typography } from "@mui/material";

export default function AboutSection() {
  return (
    <Stack spacing={1}>
      <Typography variant="h5">About</Typography>
      <Typography>Govee dashboard for historical temperature and humidity data.</Typography>
      <Typography>Use the Device Names section to assign human-friendly names.</Typography>
    </Stack>
  );
}
