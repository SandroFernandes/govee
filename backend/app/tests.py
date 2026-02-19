import json
from io import StringIO
from unittest.mock import AsyncMock, patch

from django.core.management import CommandError, call_command
from django.test import Client, TestCase

from app.govee_ble import (
    GOVEE_H5075_MFR_ID,
    H5075Reading,
    decode_temp_humid_battery_error,
    parse_h5075_manufacturer_data,
)


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

    def test_command_prints_strongest_signal_by_default(self) -> None:
        weak = self._reading("AA:AA:AA:AA:AA:01", -80)
        strong = self._reading("AA:AA:AA:AA:AA:02", -45)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[weak, strong])):
            stdout = StringIO()
            call_command("read_h5075", stdout=stdout)

        output = stdout.getvalue().strip()
        self.assertIn("AA:AA:AA:AA:AA:02", output)
        self.assertNotIn("AA:AA:AA:AA:AA:01", output)

    def test_command_json_all_outputs_all_readings(self) -> None:
        first = self._reading("AA:AA:AA:AA:AA:01", -80)
        second = self._reading("AA:AA:AA:AA:AA:02", -45)

        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[first, second])):
            stdout = StringIO()
            call_command("read_h5075", "--all", "--json", stdout=stdout)

        payload = json.loads(stdout.getvalue())
        self.assertEqual(len(payload), 2)
        self.assertEqual(payload[0]["address"], "AA:AA:AA:AA:AA:02")
        self.assertEqual(payload[1]["address"], "AA:AA:AA:AA:AA:01")

    def test_command_raises_when_no_readings_found(self) -> None:
        with patch("app.management.commands.read_h5075.Command._scan", new=AsyncMock(return_value=[])):
            with self.assertRaises(CommandError):
                call_command("read_h5075")
