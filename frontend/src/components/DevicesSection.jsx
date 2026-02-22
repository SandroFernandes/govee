import React from "react";
import { Button, Input, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

export default function DevicesSection({ devicesState, aliasInputs, setAliasInputs, saveAlias, savingState }) {
  return (
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
                <TableCell>Alias</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devicesState.devices.map((device) => (
                <TableRow key={device.address}>
                  <TableCell>{device.display_name || device.detected_name || device.address}</TableCell>
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
  );
}
