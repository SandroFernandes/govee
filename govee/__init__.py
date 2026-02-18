"""Govee API client for reading device data."""

__version__ = "0.1.0"

from .client import GoveeClient
from .exceptions import GoveeError, GoveeAPIError, GoveeAuthError, GoveeRateLimitError

__all__ = [
    "GoveeClient",
    "GoveeError",
    "GoveeAPIError", 
    "GoveeAuthError",
    "GoveeRateLimitError",
]
