import asyncio
import json
import os
from datetime import timedelta
from io import StringIO
from unittest.mock import AsyncMock, patch

from django.core.management import CommandError, call_command
from django.test import Client, TestCase
from django.utils import timezone

from app.govee_ble import (
    GOVEE_H5075_MFR_ID,
    H5075AdvertisementData,
    H5075Reading,
    decode_temp_humid_battery_error,
    parse_h5075_advertisement_data,
    parse_h5075_manufacturer_data,
)
from app.management.commands.read_h5075_history import HistoryPoint
from app.models import H5075AdvertisementSnapshot, H5075DeviceAlias, H5075HistorySyncState, H5075Measurement
from app.models import H5075HistoricalMeasurement


class HealthEndpointTests(TestCase):
    def setUp(self) -> None:
        self.client = Client()

    def test_health_returns_ok_payload(self) -> None:
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})


class AdminEndpointTests(TestCase):
    def setUp(self) -> None:
        self.client = Client()

    def test_admin_redirects_to_login(self) -> None:
        response = self.client.get("/admin/")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response["Location"])


class HistoryApiEndpointTests(TestCase):
    def setUp(self) -> None:
        self.client = Client()

    def test_history_api_returns_chart_points(self) -> None:
        H5075HistoricalMeasurement.objects.create(
            address="AA:BB:CC:DD:EE:01",
            name="H5075_A",
            measured_at=timezone.now() - timedelta(hours=2),
            temperature_c=21.1,
            humidity_pct=45.2,
        )
        H5075HistoricalMeasurement.objects.create(
            address="AA:BB:CC:DD:EE:02",
            name="H5075_B",
            measured_at=timezone.now() - timedelta(hours=1),
            temperature_c=19.5,
            humidity_pct=50.1,
        )

        response = self.client.get("/api/history/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 2)
        self.assertEqual(len(payload["points"]), 2)
        self.assertIn("measured_at", payload["points"][0])
        self.assertIn("temperature_c", payload["points"][0])
        self.assertIn("humidity_pct", payload["points"][0])

    def test_history_api_filters_by_address(self) -> None:
        H5075HistoricalMeasurement.objects.create(
            address="AA:BB:CC:DD:EE:01",
            name="H5075_A",
            measured_at=timezone.now() - timedelta(hours=2),
            temperature_c=21.1,
            humidity_pct=45.2,
        )
        H5075HistoricalMeasurement.objects.create(
            address="AA:BB:CC:DD:EE:02",
            name="H5075_B",
            measured_at=timezone.now() - timedelta(hours=1),
            temperature_c=19.5,
            humidity_pct=50.1,
        )

        response = self.client.get("/api/history/?address=AA:BB:CC:DD:EE:01")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["points"][0]["address"], "AA:BB:CC:DD:EE:01")

    def test_history_api_rejects_invalid_limit(self) -> None:
        response = self.client.get("/api/history/?limit=abc")

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid 'limit'", response.json()["error"])

    def test_history_api_uses_device_alias_name(self) -> None:
        H5075DeviceAlias.objects.create(address="aa:bb:cc:dd:ee:01", alias="Bedroom")
        H5075HistoricalMeasurement.objects.create(
            address="AA:BB:CC:DD:EE:01",
            name="H5075_RAW",
            measured_at=timezone.now() - timedelta(hours=2),
            temperature_c=21.1,
            humidity_pct=45.2,
        )

        response = self.client.get("/api/history/?address=AA:BB:CC:DD:EE:01")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["points"][0]["name"], "Bedroom")

    def test_devices_api_lists_known_devices(self) -> None:
        H5075DeviceAlias.objects.create(address="aa:bb:cc:dd:ee:01", alias="Bedroom", detected_name="H5075_A")

        response = self.client.get("/api/devices/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["devices"][0]["display_name"], "Bedroom")
        self.assertEqual(payload["devices"][0]["detected_name"], "H5075_A")


class H5075ParserTests(TestCase):
    def test_decode_temp_humidity_battery(self) -> None:
        payload = bytes([0x03, 0x94, 0x47, 0x55])

        temperature_c, humidity_pct, battery_pct, has_error = decode_temp_humid_battery_error(payload)

        self.assertAlmostEqual(temperature_c, 23.4)
        self.assertAlmostEqual(humidity_pct, 56.7)
        self.assertEqual(battery_pct, 85)
        self.assertFalse(has_error)

    def test_parse_h5075_packet(self) -> None:
        data = bytes([0x00, 0x03, 0x94, 0x47, 0x55, 0x00])

        reading = parse_h5075_manufacturer_data(
            address="AA:BB:CC:DD:EE:FF",
            local_name="GVH5075_Office",
            manufacturer_id=GOVEE_H5075_MFR_ID,
            data=data,
            rssi=-60,
        )

        self.assertIsNotNone(reading)
        assert reading is not None
        self.assertEqual(reading.address, "AA:BB:CC:DD:EE:FF")
        self.assertEqual(reading.name, "GVH5075_Office")
        self.assertAlmostEqual(reading.temperature_c, 23.4)
        self.assertAlmostEqual(reading.humidity_pct, 56.7)
        self.assertEqual(reading.battery_pct, 85)
        self.assertEqual(reading.rssi, -60)

    def test_parse_ignores_invalid_payload(self) -> None:
        reading = parse_h5075_manufacturer_data(
            address="AA:BB:CC:DD:EE:FF",
            local_name="OtherDevice",
            manufacturer_id=0x004C,
            data=b"\x01\x02\x03",
            rssi=-70,
        )

        self.assertIsNone(reading)

    def test_parse_h5075_advertisement_data(self) -> None:
        snapshot = parse_h5075_advertisement_data(
            address="AA:BB:CC:DD:EE:FF",
            local_name="H5075_LivingRoom",
            manufacturer_id=GOVEE_H5075_MFR_ID,
            data=bytes([0x00, 0x03, 0x94, 0x47, 0x55, 0x00]),
            rssi=-62,
            service_uuids=["180F"],
        )

        self.assertIsNotNone(snapshot)
        assert snapshot is not None
        self.assertEqual(snapshot.payload_hex, "000394475500")
        self.assertEqual(snapshot.service_uuids, ("180F",))


class ReadH5075CommandTests(TestCase):
    @staticmethod
    def _reading(address: str, rssi: int, temperature_c: float = 23.4, humidity_pct: float = 56.7) -> H5075Reading:
        return H5075Reading(
            address=address,
            name="H5075",
            temperature_c=temperature_c,
            humidity_pct=humidity_pct,
            battery_pct=85,
            error=False,
            rssi=rssi,
        )

    def test_command_prints_all_readings_by_default(self) -> None:
        weak = self._reading("AA:AA:AA:AA:AA:01", -80)
        strong = self._reading("AA:AA:AA:AA:AA:02", -45)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[weak, strong])):
            stdout = StringIO()
            call_command("read_h5075", stdout=stdout)

        output = stdout.getvalue().strip()
        self.assertIn("AA:AA:AA:AA:AA:02", output)
        self.assertIn("AA:AA:AA:AA:AA:01", output)
        self.assertEqual(H5075Measurement.objects.count(), 2)

    def test_command_json_outputs_all_readings_by_default(self) -> None:
        first = self._reading("AA:AA:AA:AA:AA:01", -80)
        second = self._reading("AA:AA:AA:AA:AA:02", -45)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[first, second])):
            stdout = StringIO()
            call_command("read_h5075", "--json", stdout=stdout)

        payload = json.loads(stdout.getvalue())
        self.assertEqual(len(payload), 2)
        self.assertEqual(payload[0]["address"], "AA:AA:AA:AA:AA:02")
        self.assertEqual(payload[1]["address"], "AA:AA:AA:AA:AA:01")
        self.assertEqual(H5075Measurement.objects.count(), 2)

    def test_command_raises_when_no_readings_found(self) -> None:
        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[])):
            with self.assertRaises(CommandError):
                call_command("read_h5075")

    def test_command_persists_selected_reading(self) -> None:
        weak = self._reading("AA:AA:AA:AA:AA:01", -80)
        strong = self._reading("AA:AA:AA:AA:AA:02", -45)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[weak, strong])):
            call_command("read_h5075", "--strongest")

        self.assertEqual(H5075Measurement.objects.count(), 1)
        measurement = H5075Measurement.objects.first()
        assert measurement is not None
        self.assertEqual(measurement.address, "AA:AA:AA:AA:AA:02")
        self.assertEqual(float(measurement.temperature_c), 23.4)

    def test_command_persists_all_by_default(self) -> None:
        first = self._reading("AA:AA:AA:AA:AA:01", -80)
        second = self._reading("AA:AA:AA:AA:AA:02", -45)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[first, second])):
            call_command("read_h5075")

        self.assertEqual(H5075Measurement.objects.count(), 2)

    def test_command_skips_duplicate_measurement(self) -> None:
        reading = self._reading("AA:AA:AA:AA:AA:01", -50)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[reading])):
            call_command("read_h5075")

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[reading])):
            call_command("read_h5075")

        self.assertEqual(H5075Measurement.objects.count(), 1)

    def test_command_persists_when_measurement_changes(self) -> None:
        first = self._reading("AA:AA:AA:AA:AA:01", -50, temperature_c=23.4)
        changed = self._reading("AA:AA:AA:AA:AA:01", -45, temperature_c=24.1)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[first])):
            call_command("read_h5075")

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[changed])):
            call_command("read_h5075")

        self.assertEqual(H5075Measurement.objects.count(), 2)

    def test_command_uses_alias_name_when_defined(self) -> None:
        H5075DeviceAlias.objects.create(address="aa:aa:aa:aa:aa:01", alias="Living Room")
        reading = self._reading("AA:AA:AA:AA:AA:01", -50)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[reading])):
            stdout = StringIO()
            call_command("read_h5075", "--json", stdout=stdout)

        payload = json.loads(stdout.getvalue())
        self.assertEqual(payload[0]["name"], "Living Room")
        measurement = H5075Measurement.objects.first()
        assert measurement is not None
        self.assertEqual(measurement.name, "Living Room")

    def test_command_auto_creates_device_alias_entry(self) -> None:
        reading = self._reading("AA:AA:AA:AA:AA:09", -55)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[reading])):
            call_command("read_h5075")

        alias = H5075DeviceAlias.objects.get(address="aa:aa:aa:aa:aa:09")
        self.assertEqual(alias.detected_name, "H5075")


class ReadH5075HardwareCommandTests(TestCase):
    def test_bluetooth_permissions_allow_scan(self) -> None:
        if os.getenv("RUN_HARDWARE_TESTS") != "1":
            self.skipTest("Set RUN_HARDWARE_TESTS=1 to run real BLE hardware tests")

        from bleak import BleakScanner
        from bleak.exc import BleakDBusError

        try:
            discovered = asyncio.run(BleakScanner.discover(timeout=2.0, return_adv=True))
        except BleakDBusError as exc:
            self.fail(f"Bluetooth permission/DBus access denied: {exc}")

        self.assertIsInstance(discovered, dict)

    def test_command_reads_real_hardware_when_enabled(self) -> None:
        if os.getenv("RUN_HARDWARE_TESTS") != "1":
            self.skipTest("Set RUN_HARDWARE_TESTS=1 to run real BLE hardware tests")

        timeout = os.getenv("GOVEE_TEST_TIMEOUT", "15")
        mac = os.getenv("GOVEE_TEST_MAC", "").strip()
        name = os.getenv("GOVEE_TEST_NAME", "H5075").strip()

        args = ["--timeout", timeout, "--json"]
        if mac:
            args.extend(["--mac", mac])
        else:
            args.extend(["--name-contains", name])

        stdout = StringIO()
        call_command("read_h5075", *args, stdout=stdout)

        payload = json.loads(stdout.getvalue())
        self.assertGreaterEqual(len(payload), 1)
        reading = payload[0]
        self.assertIn("address", reading)
        self.assertIn("temperature_c", reading)
        self.assertIn("humidity_pct", reading)
        self.assertIn("battery_pct", reading)

    def test_command_reads_specific_mac_when_provided(self) -> None:
        if os.getenv("RUN_HARDWARE_TESTS") != "1":
            self.skipTest("Set RUN_HARDWARE_TESTS=1 to run real BLE hardware tests")

        mac = os.getenv("GOVEE_TEST_MAC", "").strip()
        if not mac:
            self.skipTest("Set GOVEE_TEST_MAC to run strict MAC hardware test")

        timeout = os.getenv("GOVEE_TEST_TIMEOUT", "15")

        stdout = StringIO()
        call_command("read_h5075", "--timeout", timeout, "--mac", mac, "--json", stdout=stdout)

        payload = json.loads(stdout.getvalue())
        self.assertGreaterEqual(len(payload), 1)
        first_address = payload[0]["address"].lower()
        self.assertEqual(first_address, mac.lower())


class ReadH5075DumpCommandTests(TestCase):
    @staticmethod
    def _snapshot(address: str, rssi: int, payload_hex: str, temperature_c: float = 23.4) -> H5075AdvertisementData:
        return H5075AdvertisementData(
            address=address,
            name="H5075",
            manufacturer_id=GOVEE_H5075_MFR_ID,
            payload_hex=payload_hex,
            service_uuids=("180F",),
            temperature_c=temperature_c,
            humidity_pct=56.7,
            battery_pct=85,
            error=False,
            rssi=rssi,
        )

    def test_dump_command_saves_snapshots(self) -> None:
        a = self._snapshot("AA:AA:AA:AA:AA:01", -55, "000394475500")
        b = self._snapshot("AA:AA:AA:AA:AA:02", -50, "000394475501")

        with patch("app.management.commands.read_h5075_dump.Command._scan", new=AsyncMock(return_value=[a, b])):
            call_command("read_h5075_dump")

        self.assertEqual(H5075AdvertisementSnapshot.objects.count(), 2)

    def test_dump_command_skips_duplicate_snapshots(self) -> None:
        snapshot = self._snapshot("AA:AA:AA:AA:AA:01", -55, "000394475500")

        with patch("app.management.commands.read_h5075_dump.Command._scan", new=AsyncMock(return_value=[snapshot])):
            call_command("read_h5075_dump")

        with patch("app.management.commands.read_h5075_dump.Command._scan", new=AsyncMock(return_value=[snapshot])):
            call_command("read_h5075_dump")

        self.assertEqual(H5075AdvertisementSnapshot.objects.count(), 1)

    def test_dump_command_json_outputs_all(self) -> None:
        a = self._snapshot("AA:AA:AA:AA:AA:01", -55, "000394475500")
        b = self._snapshot("AA:AA:AA:AA:AA:02", -50, "000394475501")

        with patch("app.management.commands.read_h5075_dump.Command._scan", new=AsyncMock(return_value=[a, b])):
            stdout = StringIO()
            call_command("read_h5075_dump", "--json", stdout=stdout)

        payload = json.loads(stdout.getvalue())
        self.assertEqual(len(payload), 2)
        self.assertIn("payload_hex", payload[0])


class ReadH5075HistoryCommandTests(TestCase):
    def test_history_command_defaults_to_all_devices(self) -> None:
        points_a = [
            HistoryPoint(
                address="AA:BB:CC:DD:EE:01",
                name="H5075_A",
                measured_at="2026-02-20T10:00:00+00:00",
                temperature_c=21.1,
                humidity_pct=45.2,
            )
        ]
        points_b = [
            HistoryPoint(
                address="AA:BB:CC:DD:EE:02",
                name="H5075_B",
                measured_at="2026-02-20T10:00:00+00:00",
                temperature_c=19.5,
                humidity_pct=50.1,
            )
        ]

        async def fake_read_history(mac: str, start_minutes: int, end_minutes: int, timeout: float) -> list[HistoryPoint]:
            if mac == "aa:bb:cc:dd:ee:01":
                return points_a
            if mac == "aa:bb:cc:dd:ee:02":
                return points_b
            return []

        with patch(
            "app.management.commands.read_h5075_history.Command._discover_targets",
            new=AsyncMock(return_value=["aa:bb:cc:dd:ee:01", "aa:bb:cc:dd:ee:02"]),
        ), patch(
            "app.management.commands.read_h5075_history.Command._read_history",
            new=AsyncMock(side_effect=fake_read_history),
        ):
            call_command("read_h5075_history")

        self.assertEqual(H5075HistoricalMeasurement.objects.count(), 2)

    def test_history_command_saves_records(self) -> None:
        points = [
            HistoryPoint(
                address="AA:BB:CC:DD:EE:FF",
                name="H5075_A",
                measured_at="2026-02-20T10:00:00+00:00",
                temperature_c=21.1,
                humidity_pct=45.2,
            ),
            HistoryPoint(
                address="AA:BB:CC:DD:EE:FF",
                name="H5075_A",
                measured_at="2026-02-20T10:01:00+00:00",
                temperature_c=21.2,
                humidity_pct=45.3,
            ),
        ]

        with patch("app.management.commands.read_h5075_history.Command._read_history", new=AsyncMock(return_value=points)):
            call_command("read_h5075_history", "--mac", "AA:BB:CC:DD:EE:FF")

        self.assertEqual(H5075HistoricalMeasurement.objects.count(), 2)

    def test_history_command_skips_duplicates(self) -> None:
        point = HistoryPoint(
            address="AA:BB:CC:DD:EE:FF",
            name="H5075_A",
            measured_at="2026-02-20T10:00:00+00:00",
            temperature_c=21.1,
            humidity_pct=45.2,
        )

        with patch("app.management.commands.read_h5075_history.Command._read_history", new=AsyncMock(return_value=[point])):
            call_command("read_h5075_history", "--mac", "AA:BB:CC:DD:EE:FF")

        with patch("app.management.commands.read_h5075_history.Command._read_history", new=AsyncMock(return_value=[point])):
            call_command("read_h5075_history", "--mac", "AA:BB:CC:DD:EE:FF")

        self.assertEqual(H5075HistoricalMeasurement.objects.count(), 1)

    def test_history_command_json_output(self) -> None:
        point = HistoryPoint(
            address="AA:BB:CC:DD:EE:FF",
            name="H5075_A",
            measured_at="2026-02-20T10:00:00+00:00",
            temperature_c=21.1,
            humidity_pct=45.2,
        )

        with patch("app.management.commands.read_h5075_history.Command._read_history", new=AsyncMock(return_value=[point])):
            stdout = StringIO()
            call_command("read_h5075_history", "--mac", "AA:BB:CC:DD:EE:FF", "--json", stdout=stdout)

        payload = json.loads(stdout.getvalue())
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["address"], "AA:BB:CC:DD:EE:FF")


class SyncH5075HistoryCommandTests(TestCase):
    def test_sync_runs_when_never_succeeded(self) -> None:
        with patch("app.management.commands.sync_h5075_history.call_command") as mocked_call:
            call_command("sync_h5075_history", "--days", "4")

        state = H5075HistorySyncState.objects.get(job_name="read_h5075_history")
        self.assertEqual(state.last_status, "success")
        self.assertIsNotNone(state.last_success_at)
        mocked_call.assert_called_once()

    def test_sync_skips_when_not_due(self) -> None:
        now = timezone.now()
        H5075HistorySyncState.objects.create(
            job_name="read_h5075_history",
            last_status="success",
            last_attempt_at=now,
            last_success_at=now - timedelta(days=1),
        )

        with patch("app.management.commands.sync_h5075_history.call_command") as mocked_call:
            stdout = StringIO()
            call_command("sync_h5075_history", "--days", "4", stdout=stdout)

        self.assertIn("Skip: last successful sync", stdout.getvalue())
        mocked_call.assert_not_called()

    def test_sync_records_failure_state(self) -> None:
        with patch("app.management.commands.sync_h5075_history.call_command", side_effect=CommandError("boom")):
            with self.assertRaises(CommandError):
                call_command("sync_h5075_history", "--days", "4")

        state = H5075HistorySyncState.objects.get(job_name="read_h5075_history")
        self.assertEqual(state.last_status, "error")
        self.assertIn("boom", state.last_error)
