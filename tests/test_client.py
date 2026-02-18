"""Unit tests for the Govee API client."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from govee import GoveeClient, GoveeAuthError, GoveeRateLimitError, GoveeAPIError
from govee.models import Device, DeviceState


class TestGoveeClient:
    """Tests for GoveeClient class."""
    
    def test_init_with_valid_api_key(self):
        """Test client initialization with valid API key."""
        client = GoveeClient("test-api-key")
        assert client.api_key == "test-api-key"
        assert client.base_url == GoveeClient.BASE_URL
        assert "Govee-API-Key" in client.session.headers
        client.close()
    
    def test_init_with_empty_api_key(self):
        """Test client initialization with empty API key raises ValueError."""
        with pytest.raises(ValueError, match="API key is required"):
            GoveeClient("")
    
    def test_init_with_none_api_key(self):
        """Test client initialization with None API key raises ValueError."""
        with pytest.raises(ValueError, match="API key is required"):
            GoveeClient(None)
    
    def test_init_with_custom_base_url(self):
        """Test client initialization with custom base URL."""
        custom_url = "https://custom-api.example.com"
        client = GoveeClient("test-api-key", base_url=custom_url)
        assert client.base_url == custom_url
        client.close()
    
    def test_context_manager(self):
        """Test client as context manager."""
        with GoveeClient("test-api-key") as client:
            assert client.api_key == "test-api-key"
        # Session should be closed after exiting context
    
    @patch('govee.client.requests.Session.request')
    def test_list_devices_success(self, mock_request):
        """Test listing devices successfully."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "devices": [
                    {
                        "device": "AA:BB:CC:DD:EE:FF:00:11",
                        "model": "H6163",
                        "deviceName": "Test Light",
                        "controllable": True,
                        "retrievable": True,
                        "supportCmds": ["turn", "brightness", "color"]
                    }
                ]
            },
            "message": "Success"
        }
        mock_request.return_value = mock_response
        
        client = GoveeClient("test-api-key")
        devices = client.list_devices()
        
        assert len(devices) == 1
        assert isinstance(devices[0], Device)
        assert devices[0].device_name == "Test Light"
        assert devices[0].model == "H6163"
        assert devices[0].controllable is True
        client.close()
    
    @patch('govee.client.requests.Session.request')
    def test_list_devices_empty(self, mock_request):
        """Test listing devices with empty response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {"devices": []},
            "message": "Success"
        }
        mock_request.return_value = mock_response
        
        client = GoveeClient("test-api-key")
        devices = client.list_devices()
        
        assert len(devices) == 0
        client.close()
    
    @patch('govee.client.requests.Session.request')
    def test_get_device_state_success(self, mock_request):
        """Test getting device state successfully."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "device": "AA:BB:CC:DD:EE:FF:00:11",
                "model": "H6163",
                "properties": [
                    {"online": True},
                    {"powerState": "on"},
                    {"brightness": 75},
                    {"color": {"r": 255, "g": 0, "b": 0}}
                ]
            },
            "message": "Success"
        }
        mock_request.return_value = mock_response
        
        client = GoveeClient("test-api-key")
        state = client.get_device_state("AA:BB:CC:DD:EE:FF:00:11", "H6163")
        
        assert isinstance(state, DeviceState)
        assert state.is_online is True
        assert state.power_state == "on"
        assert state.brightness == 75
        assert state.color == {"r": 255, "g": 0, "b": 0}
        client.close()
    
    def test_get_device_state_empty_device(self):
        """Test getting device state with empty device raises ValueError."""
        client = GoveeClient("test-api-key")
        with pytest.raises(ValueError, match="Device MAC address is required"):
            client.get_device_state("", "H6163")
        client.close()
    
    def test_get_device_state_empty_model(self):
        """Test getting device state with empty model raises ValueError."""
        client = GoveeClient("test-api-key")
        with pytest.raises(ValueError, match="Device model is required"):
            client.get_device_state("AA:BB:CC:DD:EE:FF:00:11", "")
        client.close()
    
    @patch('govee.client.requests.Session.request')
    def test_auth_error_handling(self, mock_request):
        """Test handling of authentication errors (401)."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_request.return_value = mock_response
        
        client = GoveeClient("invalid-key")
        with pytest.raises(GoveeAuthError, match="Authentication failed"):
            client.list_devices()
        client.close()
    
    @patch('govee.client.requests.Session.request')
    def test_rate_limit_error_handling(self, mock_request):
        """Test handling of rate limit errors (429)."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_request.return_value = mock_response
        
        client = GoveeClient("test-api-key")
        with pytest.raises(GoveeRateLimitError, match="Rate limit exceeded"):
            client.list_devices()
        client.close()
    
    @patch('govee.client.requests.Session.request')
    def test_api_error_handling(self, mock_request):
        """Test handling of general API errors."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.json.return_value = {"message": "Internal server error"}
        mock_request.return_value = mock_response
        
        client = GoveeClient("test-api-key")
        with pytest.raises(GoveeAPIError):
            client.list_devices()
        client.close()


class TestDevice:
    """Tests for Device model."""
    
    def test_from_dict(self):
        """Test creating Device from dictionary."""
        data = {
            "device": "AA:BB:CC:DD:EE:FF:00:11",
            "model": "H6163",
            "deviceName": "My Light",
            "controllable": True,
            "retrievable": True,
            "supportCmds": ["turn", "brightness"]
        }
        
        device = Device.from_dict(data)
        
        assert device.device == "AA:BB:CC:DD:EE:FF:00:11"
        assert device.model == "H6163"
        assert device.device_name == "My Light"
        assert device.controllable is True
        assert device.retrievable is True
        assert device.supported_commands == ["turn", "brightness"]
    
    def test_from_dict_with_missing_fields(self):
        """Test creating Device from dictionary with missing fields."""
        data = {
            "device": "AA:BB:CC:DD:EE:FF:00:11",
            "model": "H6163"
        }
        
        device = Device.from_dict(data)
        
        assert device.device == "AA:BB:CC:DD:EE:FF:00:11"
        assert device.model == "H6163"
        assert device.device_name == ""
        assert device.controllable is False
        assert device.retrievable is False
        assert device.supported_commands == []


class TestDeviceState:
    """Tests for DeviceState model."""
    
    def test_from_dict(self):
        """Test creating DeviceState from dictionary."""
        data = {
            "device": "AA:BB:CC:DD:EE:FF:00:11",
            "model": "H6163",
            "properties": [
                {"online": True},
                {"powerState": "on"},
                {"brightness": 80}
            ]
        }
        
        state = DeviceState.from_dict(data)
        
        assert state.device == "AA:BB:CC:DD:EE:FF:00:11"
        assert state.model == "H6163"
        assert len(state.properties) == 3
    
    def test_get_property(self):
        """Test getting a specific property."""
        state = DeviceState(
            device="AA:BB:CC:DD:EE:FF:00:11",
            model="H6163",
            properties=[
                {"online": True},
                {"powerState": "on"},
                {"brightness": 80}
            ]
        )
        
        assert state.get_property("online") is True
        assert state.get_property("powerState") == "on"
        assert state.get_property("brightness") == 80
        assert state.get_property("nonexistent") is None
    
    def test_property_shortcuts(self):
        """Test property shortcut methods."""
        state = DeviceState(
            device="AA:BB:CC:DD:EE:FF:00:11",
            model="H6163",
            properties=[
                {"online": True},
                {"powerState": "on"},
                {"brightness": 65},
                {"color": {"r": 128, "g": 255, "b": 0}}
            ]
        )
        
        assert state.is_online is True
        assert state.power_state == "on"
        assert state.brightness == 65
        assert state.color == {"r": 128, "g": 255, "b": 0}
    
    def test_property_shortcuts_with_missing_values(self):
        """Test property shortcuts when values are missing."""
        state = DeviceState(
            device="AA:BB:CC:DD:EE:FF:00:11",
            model="H6163",
            properties=[]
        )
        
        assert state.is_online is None
        assert state.power_state is None
        assert state.brightness is None
        assert state.color is None
