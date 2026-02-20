from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, dataclass
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from app.govee_ble import decode_temp_humid
from app.models import H5075HistoricalMeasurement


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
        parser.add_argument("--mac", type=str, required=True, help="Target H5075 MAC address.")
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
        parser.add_argument("--json", action="store_true", help="Output JSON.")

    def handle(self, *args, **options) -> None:
        mac = (options["mac"] or "").strip()
        if not mac:
            raise CommandError("--mac is required")

        start_minutes = self._parse_minutes(options["start"], default_minutes=28800)
        end_minutes = self._parse_minutes(options["end"], default_minutes=0)

        start_minutes = min(start_minutes, 28800)
        end_minutes = min(end_minutes, 28800)

        if start_minutes < end_minutes:
            start_minutes, end_minutes = end_minutes, start_minutes

        try:
            points = asyncio.run(
                self._read_history(
                    mac=mac,
                    start_minutes=start_minutes,
                    end_minutes=end_minutes,
                    timeout=float(options["timeout"]),
                )
            )
        except RuntimeError as exc:
            raise CommandError(f"Bluetooth history read failed: {exc}") from exc

        if not points:
            raise CommandError("No historical records returned by the device.")

        before_count = H5075HistoricalMeasurement.objects.filter(address=mac).count()

        H5075HistoricalMeasurement.objects.bulk_create(
            [
                H5075HistoricalMeasurement(
                    address=item.address,
                    name=item.name,
                    measured_at=timezone.datetime.fromisoformat(item.measured_at),
                    temperature_c=item.temperature_c,
                    humidity_pct=item.humidity_pct,
                )
                for item in points
            ],
            ignore_conflicts=True,
        )

        after_count = H5075HistoricalMeasurement.objects.filter(address=mac).count()
        saved = after_count - before_count
        skipped = len(points) - saved

        self.stderr.write(f"Saved {saved} historical record(s), skipped {skipped} duplicate(s)")

        if options["json"]:
            self.stdout.write(json.dumps([asdict(p) for p in points], indent=2))
            return

        for item in points:
            self.stdout.write(
                f"{item.measured_at} {item.name} [{item.address}] "
                f"temp={item.temperature_c:.1f}°C humidity={item.humidity_pct:.1f}%"
            )

    async def _read_history(self, mac: str, start_minutes: int, end_minutes: int, timeout: float) -> list[HistoryPoint]:
        from bleak import BleakClient

        completion = asyncio.Event()
        start_reference = timezone.now()
        records: list[HistoryPoint] = []

        async with BleakClient(mac, timeout=timeout) as client:
            device_name = await self._safe_read_name(client)

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

            await client.start_notify(self.UUID_COMMAND, on_command)
            await client.start_notify(self.UUID_DATA, on_data)
            await client.write_gatt_char(
                self.UUID_COMMAND,
                self._build_history_command(start_minutes=start_minutes, end_minutes=end_minutes),
                response=True,
            )

            try:
                await asyncio.wait_for(completion.wait(), timeout=timeout)
            except TimeoutError:
                pass
            finally:
                await client.stop_notify(self.UUID_DATA)
                await client.stop_notify(self.UUID_COMMAND)

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
