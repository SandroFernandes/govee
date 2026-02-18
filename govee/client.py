"""Govee API client for interacting with Govee devices."""

import requests
from typing import List, Optional
from .models import Device, DeviceState
from .exceptions import GoveeAPIError, GoveeAuthError, GoveeRateLimitError


class GoveeClient:
    """Client for interacting with the Govee API.
    
    This client provides methods to list devices and read their current state
    using the official Govee Developer API.
    
    Attributes:
        api_key: Your Govee API key from the developer portal
        base_url: Base URL for the Govee API (default: https://developer-api.govee.com/v1)
    """
    
    BASE_URL = "https://developer-api.govee.com/v1"
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """Initialize the Govee API client.
        
        Args:
            api_key: Your Govee API key
            base_url: Optional custom base URL for the API
            
        Raises:
            ValueError: If api_key is empty or None
        """
        if not api_key:
            raise ValueError("API key is required")
        
        self.api_key = api_key
        self.base_url = base_url or self.BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            "Govee-API-Key": self.api_key,
            "Content-Type": "application/json"
        })
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> dict:
        """Make an HTTP request to the Govee API.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            **kwargs: Additional arguments to pass to requests
            
        Returns:
            API response data as dict
            
        Raises:
            GoveeAuthError: If authentication fails (401)
            GoveeRateLimitError: If rate limit is exceeded (429)
            GoveeAPIError: For other API errors
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            
            # Handle specific error codes
            if response.status_code == 401:
                raise GoveeAuthError(
                    "Authentication failed. Check your API key.",
                    status_code=401,
                    response=response
                )
            elif response.status_code == 429:
                raise GoveeRateLimitError(
                    "Rate limit exceeded. Please wait before making more requests.",
                    status_code=429,
                    response=response
                )
            elif response.status_code != 200:
                error_message = f"API request failed with status {response.status_code}"
                try:
                    error_data = response.json()
                    if "message" in error_data:
                        error_message = error_data["message"]
                except:
                    pass
                raise GoveeAPIError(
                    error_message,
                    status_code=response.status_code,
                    response=response
                )
            
            return response.json()
            
        except requests.RequestException as e:
            raise GoveeAPIError(f"Request failed: {str(e)}")
    
    def list_devices(self) -> List[Device]:
        """Get a list of all devices associated with the account.
        
        Returns:
            List of Device objects
            
        Raises:
            GoveeAuthError: If authentication fails
            GoveeRateLimitError: If rate limit is exceeded
            GoveeAPIError: For other API errors
        """
        response = self._make_request("GET", "/devices")
        
        devices_data = response.get("data", {}).get("devices", [])
        return [Device.from_dict(device) for device in devices_data]
    
    def get_device_state(self, device: str, model: str) -> DeviceState:
        """Get the current state of a specific device.
        
        Args:
            device: Device MAC address (e.g., "AA:BB:CC:DD:EE:FF:00:11")
            model: Device model name (e.g., "H6163")
            
        Returns:
            DeviceState object with current device state
            
        Raises:
            ValueError: If device or model is empty
            GoveeAuthError: If authentication fails
            GoveeRateLimitError: If rate limit is exceeded
            GoveeAPIError: For other API errors
        """
        if not device:
            raise ValueError("Device MAC address is required")
        if not model:
            raise ValueError("Device model is required")
        
        params = {
            "device": device,
            "model": model
        }
        
        response = self._make_request("GET", "/devices/state", params=params)
        
        state_data = response.get("data", {})
        return DeviceState.from_dict(state_data)
    
    def close(self):
        """Close the HTTP session."""
        self.session.close()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
