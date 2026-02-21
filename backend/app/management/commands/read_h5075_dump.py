from __future__ import annotations

import asyncio
import json
from dataclasses import asdict

from django.core.management.base import BaseCommand, CommandError

from app.govee_ble import H5075AdvertisementData, parse_h5075_advertisement_data
from app.models import H5075AdvertisementSnapshot, H5075DeviceAlias


class Command(BaseCommand):
    help = "Read rich H5075 BLE advertisement data and store deduplicated snapshots."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--mac", type=str, default="", help="Target device MAC address (optional).")
        parser.add_argument(
            "--name-contains",
            type=str,
            default="H5075",
            help="Filter by device name substring when --mac is not provided.",
        )
        parser.add_argument("--timeout", type=float, default=10.0, help="BLE scan timeout in seconds.")
        parser.add_argument("--json", action="store_true", help="Output JSON.")

    def handle(self, *args, **options) -> None:
        try:
            snapshots = asyncio.run(
                self._scan(
                    mac=(options["mac"] or "").strip().lower(),
                    name_contains=(options["name_contains"] or "").strip(),
                    timeout=float(options["timeout"]),
                )
            )
        except RuntimeError as exc:
            raise CommandError(f"Bluetooth scan failed: {exc}") from exc

        if not snapshots:
            raise CommandError("No H5075 snapshot data found.")

        snapshots.sort(key=lambda item: item.rssi if item.rssi is not None else -9999, reverse=True)
        self._upsert_detected_names(snapshots)
        name_map = self._get_name_map([item.address for item in snapshots])

        saved = 0
        skipped = 0
        for item in snapshots:
            _, created = H5075AdvertisementSnapshot.objects.get_or_create(
                address=item.address,
                manufacturer_id=item.manufacturer_id,
                payload_hex=item.payload_hex,
                defaults={
                    "name": name_map.get(item.address.lower(), item.name),
                    "service_uuids": list(item.service_uuids),
                    "temperature_c": item.temperature_c,
                    "humidity_pct": item.humidity_pct,
                    "battery_pct": item.battery_pct,
                    "error": item.error,
                    "rssi": item.rssi,
                },
            )
            if created:
                saved += 1
            else:
                skipped += 1

        self.stderr.write(f"Saved {saved} snapshot(s), skipped {skipped} duplicate(s)")

        if options["json"]:
            payload = []
            for item in snapshots:
                row = asdict(item)
                row["name"] = name_map.get(item.address.lower(), item.name)
                payload.append(row)
            self.stdout.write(json.dumps(payload, indent=2))
            return

        for item in snapshots:
            name = name_map.get(item.address.lower(), item.name)
            line = (
                f"{name} [{item.address}] mfr={item.manufacturer_id} payload={item.payload_hex} "
                f"temp={item.temperature_c:.1f}°C humidity={item.humidity_pct:.1f}% "
                f"battery={item.battery_pct}% rssi={item.rssi}"
            )
            if item.error:
                line += " error=true"
            self.stdout.write(line)

    async def _scan(self, mac: str, name_contains: str, timeout: float) -> list[H5075AdvertisementData]:
        from bleak import BleakScanner

        discovered = await BleakScanner.discover(timeout=timeout, return_adv=True)
        matches: list[H5075AdvertisementData] = []

        for address, (device, advertisement) in discovered.items():
            device_address = address.lower()
            if mac and device_address != mac:
                continue

            local_name = (advertisement.local_name or device.name or "").strip()
            if not mac and name_contains and name_contains.lower() not in local_name.lower():
                continue

            for manufacturer_id, data in advertisement.manufacturer_data.items():
                parsed = parse_h5075_advertisement_data(
                    address=device.address,
                    local_name=local_name,
                    manufacturer_id=manufacturer_id,
                    data=data,
                    rssi=advertisement.rssi,
                    service_uuids=advertisement.service_uuids,
                )
                if parsed is not None:
                    matches.append(parsed)

        return matches

    @staticmethod
    def _get_name_map(addresses: list[str]) -> dict[str, str]:
        normalized = sorted({(address or "").strip().lower() for address in addresses if address})
        if not normalized:
            return {}

        aliases = H5075DeviceAlias.objects.filter(address__in=normalized)
        return {item.address.lower(): (item.alias or item.detected_name or item.address) for item in aliases}

    @staticmethod
    def _upsert_detected_names(snapshots: list[H5075AdvertisementData]) -> None:
        for item in snapshots:
            address = (item.address or "").strip().lower()
            if not address:
                continue

            detected_name = (item.name or "").strip()
            alias, _ = H5075DeviceAlias.objects.get_or_create(
                address=address,
                defaults={"detected_name": detected_name},
            )
            if alias.detected_name != detected_name:
                alias.detected_name = detected_name
                alias.save(update_fields=["detected_name", "updated_at"])
