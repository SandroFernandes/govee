from django.test import Client, TestCase


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
