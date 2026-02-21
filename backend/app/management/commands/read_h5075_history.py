from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import asdict, dataclass
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from app.govee_ble import decode_temp_humid
from app.models import H5075DeviceAlias, H5075HistoricalMeasurement


@dataclass(frozen=True)
class HistoryPoint:
    address: str
    name: str
    measured_at: str
    temperature_c: float
    humidity_pct: float


class Command(BaseCommand):
    help = "Read historical H5075 records from device storage and save deduplicated measurements."

    UUID_NAME = "00002a00-0000-1000-8000-00805f9b34fb"
    UUID_COMMAND = "494e5445-4c4c-495f-524f-434b535f2012"
    UUID_DATA = "494e5445-4c4c-495f-524f-434b535f2013"

    SEND_RECORDS_TX_REQUEST = bytearray([0x33, 0x01])
    RECORDS_TX_COMPLETED = bytearray([0xEE, 0x01])

    def add_arguments(self, parser) -> None:
        parser.add_argument("--mac", type=str, default="", help="Target H5075 MAC address (optional).")
        parser.add_argument(
            "--name-contains",
            type=str,
            default="H5075",
            help="Filter by device name substring when --mac is not provided.",
        )
        parser.add_argument(
            "--start",
            type=str,
            default="480:00",
            help="Oldest point in the past as hhh:mm (max 480:00 = 20 days).",
        )
        parser.add_argument(
            "--end",
            type=str,
            default="0:00",
            help="Newest point in the past as hhh:mm.",
        )
        parser.add_argument("--timeout", type=float, default=20.0, help="Command timeout in seconds.")
        parser.add_argument(
            "--retries",
            type=int,
            default=2,
            help="Connection retries per device when history read fails.",
        )
        parser.add_argument("--json", action="store_true", help="Output JSON.")

    def handle(self, *args, **options) -> None:
        self._configure_ble_logging()

        mac = (options["mac"] or "").strip().lower()
        name_contains = (options["name_contains"] or "").strip()

        start_minutes = self._parse_minutes(options["start"], default_minutes=28800)
        end_minutes = self._parse_minutes(options["end"], default_minutes=0)

        start_minutes = min(start_minutes, 28800)
        end_minutes = min(end_minutes, 28800)

        if start_minutes < end_minutes:
            start_minutes, end_minutes = end_minutes, start_minutes

        timeout = float(options["timeout"])
        retries = max(0, int(options["retries"]))

        try:
            points, failures = asyncio.run(
                self._collect_history(
                    mac=mac,
                    name_contains=name_contains,
                    start_minutes=start_minutes,
                    end_minutes=end_minutes,
                    timeout=timeout,
                    retries=retries,
                )
            )
        except RuntimeError as exc:
            raise CommandError(f"Bluetooth history read failed: {exc}") from exc

        if not points:
            if failures:
                raise CommandError(f"No historical records returned by device(s). Errors: {'; '.join(failures)}")
            raise CommandError("No historical records returned by device(s).")

        self._upsert_detected_names(points)
        name_map = self._get_name_map([item.address for item in points])

        before_count = H5075HistoricalMeasurement.objects.count()

        H5075HistoricalMeasurement.objects.bulk_create(
            [
                H5075HistoricalMeasurement(
                    address=item.address,
                    name=name_map.get(item.address.lower(), item.name),
                    measured_at=timezone.datetime.fromisoformat(item.measured_at),
                    temperature_c=item.temperature_c,
                    humidity_pct=item.humidity_pct,
                )
                for item in points
            ],
            ignore_conflicts=True,
        )

        after_count = H5075HistoricalMeasurement.objects.count()
        saved = after_count - before_count
        skipped = len(points) - saved

        self.stderr.write(f"Saved {saved} historical record(s), skipped {skipped} duplicate(s)")
        if failures:
            self.stderr.write(f"Skipped {len(failures)} device(s) due to errors: {'; '.join(failures)}")

        if options["json"]:
            payload = []
            for item in points:
                row = asdict(item)
                row["name"] = name_map.get(item.address.lower(), item.name)
                payload.append(row)
            self.stdout.write(json.dumps(payload, indent=2))
            return

        for item in points:
            name = name_map.get(item.address.lower(), item.name)
            self.stdout.write(
                f"{item.measured_at} {name} [{item.address}] "
                f"temp={item.temperature_c:.1f}°C humidity={item.humidity_pct:.1f}%"
            )

    @staticmethod
    def _configure_ble_logging() -> None:
        logging.getLogger("bleak.backends.bluezdbus.version").setLevel(logging.ERROR)

    @staticmethod
    def _get_name_map(addresses: list[str]) -> dict[str, str]:
        normalized = sorted({(address or "").strip().lower() for address in addresses if address})
        if not normalized:
            return {}

        aliases = H5075DeviceAlias.objects.filter(address__in=normalized)
        return {item.address.lower(): (item.alias or item.detected_name or item.address) for item in aliases}

    @staticmethod
    def _upsert_detected_names(points: list[HistoryPoint]) -> None:
        for item in points:
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

    async def _collect_history(
        self,
        mac: str,
        name_contains: str,
        start_minutes: int,
        end_minutes: int,
        timeout: float,
        retries: int,
    ) -> tuple[list[HistoryPoint], list[str]]:
        targets = [mac] if mac else await self._discover_targets(name_contains=name_contains, timeout=timeout)
        if not targets:
            return [], []

        points: list[HistoryPoint] = []
        failures: list[str] = []

        for address in targets:
            last_error: Exception | None = None
            for _ in range(retries + 1):
                try:
                    device_points = await self._read_history(
                        mac=address,
                        start_minutes=start_minutes,
                        end_minutes=end_minutes,
                        timeout=timeout,
                    )
                    points.extend(device_points)
                    last_error = None
                    break
                except Exception as exc:
                    last_error = exc
                    await asyncio.sleep(0.4)

            if last_error is not None:
                failures.append(f"{address}: {last_error}")

        points.sort(key=lambda item: (item.measured_at, item.address))
        return points, failures

    async def _discover_targets(self, name_contains: str, timeout: float) -> list[str]:
        from bleak import BleakScanner

        discovered = await BleakScanner.discover(timeout=timeout, return_adv=True)
        targets: list[str] = []

        for address, (device, advertisement) in discovered.items():
            local_name = (advertisement.local_name or device.name or "").strip()
            if name_contains and name_contains.lower() not in local_name.lower():
                continue

            targets.append(address.lower())

        return sorted(set(targets))

    async def _read_history(self, mac: str, start_minutes: int, end_minutes: int, timeout: float) -> list[HistoryPoint]:
        from bleak import BleakClient

        completion = asyncio.Event()
        start_reference = timezone.now()
        records: list[HistoryPoint] = []

        async with BleakClient(mac, timeout=timeout) as client:
            if not client.is_connected:
                raise RuntimeError("Unable to connect")

            device_name = await self._safe_read_name(client)
            command_notify_started = False
            data_notify_started = False

            def on_command(_: object, data: bytearray) -> None:
                if data[0:2] == self.RECORDS_TX_COMPLETED:
                    completion.set()

            def on_data(_: object, data: bytearray) -> None:
                if len(data) < 20:
                    return

                minutes_back = int.from_bytes(data[0:2], byteorder="big", signed=False)
                for i in range(6):
                    chunk = bytes(data[2 + 3 * i : 5 + 3 * i])
                    if len(chunk) != 3 or chunk[0] == 0xFF:
                        continue

                    temperature_c, humidity_pct = decode_temp_humid(chunk)
                    measured_at = start_reference - timedelta(minutes=(minutes_back - i))
                    records.append(
                        HistoryPoint(
                            address=mac,
                            name=device_name,
                            measured_at=measured_at.isoformat(),
                            temperature_c=temperature_c,
                            humidity_pct=humidity_pct,
                        )
                    )

            try:
                await client.start_notify(self.UUID_COMMAND, on_command)
                command_notify_started = True
                await client.start_notify(self.UUID_DATA, on_data)
                data_notify_started = True
                await client.write_gatt_char(
                    self.UUID_COMMAND,
                    self._build_history_command(start_minutes=start_minutes, end_minutes=end_minutes),
                    response=True,
                )
            except Exception as exc:
                raise RuntimeError(f"GATT setup failed: {exc}") from exc

            try:
                await asyncio.wait_for(completion.wait(), timeout=timeout)
            except TimeoutError:
                pass
            finally:
                if client.is_connected and data_notify_started:
                    try:
                        await client.stop_notify(self.UUID_DATA)
                    except Exception:
                        pass
                if client.is_connected and command_notify_started:
                    try:
                        await client.stop_notify(self.UUID_COMMAND)
                    except Exception:
                        pass

        records.sort(key=lambda item: item.measured_at)
        return records

    async def _safe_read_name(self, client: object) -> str:
        try:
            raw_name = await client.read_gatt_char(self.UUID_NAME)
            name = bytes(raw_name).decode(errors="ignore").strip("\x00").strip()
            return name or "H5075"
        except Exception:
            return "H5075"

    @staticmethod
    def _build_history_command(start_minutes: int, end_minutes: int) -> bytes:
        packet = bytearray(Command.SEND_RECORDS_TX_REQUEST)
        packet.extend([start_minutes >> 8, start_minutes & 0xFF, end_minutes >> 8, end_minutes & 0xFF])
        while len(packet) < 19:
            packet.append(0x00)

        checksum = 0
        for value in packet:
            checksum ^= value
        packet.append(checksum)
        return bytes(packet)

    @staticmethod
    def _parse_minutes(value: str, default_minutes: int) -> int:
        if not value:
            return default_minutes

        parts = value.split(":")
        if len(parts) == 1:
            return max(0, int(parts[0]))

        if len(parts) == 2:
            hours = int(parts[0])
            minutes = int(parts[1])
            return max(0, hours * 60 + minutes)

        raise CommandError(f"Invalid time expression '{value}'. Use hhh:mm or minutes.")
