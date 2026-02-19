from django.test import Client, TestCase

from app.govee_ble import GOVEE_H5075_MFR_ID, decode_temp_humid_battery_error, parse_h5075_manufacturer_data


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
