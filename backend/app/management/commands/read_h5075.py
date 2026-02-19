from __future__ import annotations

import asyncio
import json
from dataclasses import asdict

from django.core.management.base import BaseCommand, CommandError

from app.govee_ble import H5075Reading, parse_h5075_manufacturer_data


class Command(BaseCommand):
    help = "Scan Bluetooth advertisements and read Govee H5075 temperature/humidity data."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--mac", type=str, default="", help="Target device MAC address (optional).")
        parser.add_argument(
            "--name-contains",
            type=str,
            default="H5075",
            help="Filter by device name substring when --mac is not provided.",
        )
        parser.add_argument("--timeout", type=float, default=10.0, help="BLE scan timeout in seconds.")
        parser.add_argument(
            "--all",
            action="store_true",
            help="Print all matching H5075 readings (default prints strongest RSSI only).",
        )
        parser.add_argument("--json", action="store_true", help="Output JSON.")

    def handle(self, *args, **options) -> None:
        try:
            readings = asyncio.run(
                self._scan(
                    mac=(options["mac"] or "").strip().lower(),
                    name_contains=(options["name_contains"] or "").strip(),
                    timeout=float(options["timeout"]),
                )
            )
        except RuntimeError as exc:
            raise CommandError(f"Bluetooth scan failed: {exc}") from exc

        if not readings:
            raise CommandError(
                "No H5075 readings found. Ensure Bluetooth is enabled, device is nearby, and ALLOW access to BLE."
            )

        readings.sort(key=lambda item: item.rssi if item.rssi is not None else -9999, reverse=True)
        selected = readings if options["all"] else readings[:1]

        if options["json"]:
            self.stdout.write(json.dumps([asdict(item) for item in selected], indent=2))
            return

        for item in selected:
            line = (
                f"{item.name} [{item.address}] "
                f"temp={item.temperature_c:.1f}°C humidity={item.humidity_pct:.1f}% "
                f"battery={item.battery_pct}% rssi={item.rssi}"
            )
            if item.error:
                line += " error=true"
            self.stdout.write(line)

    async def _scan(self, mac: str, name_contains: str, timeout: float) -> list[H5075Reading]:
        from bleak import BleakScanner

        discovered = await BleakScanner.discover(timeout=timeout, return_adv=True)
        matches: list[H5075Reading] = []

        for address, (device, advertisement) in discovered.items():
            device_address = address.lower()
            if mac and device_address != mac:
                continue

            local_name = (advertisement.local_name or device.name or "").strip()
            if not mac and name_contains and name_contains.lower() not in local_name.lower():
                continue

            rssi = advertisement.rssi
            for manufacturer_id, data in advertisement.manufacturer_data.items():
                parsed = parse_h5075_manufacturer_data(
                    address=device.address,
                    local_name=local_name,
                    manufacturer_id=manufacturer_id,
                    data=data,
                    rssi=rssi,
                )
                if parsed is not None:
                    matches.append(parsed)

        return matches
