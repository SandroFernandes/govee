"""Data models for Govee devices and device states."""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class Device:
    """Represents a Govee device.
    
    Attributes:
        device: Device MAC address
        model: Device model name
        device_name: Human-readable device name
        controllable: Whether the device can be controlled
        retrievable: Whether the device state can be retrieved
        supported_commands: List of supported commands
    """
    device: str
    model: str
    device_name: str
    controllable: bool
    retrievable: bool
    supported_commands: List[str]
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Device":
        """Create a Device instance from API response data."""
        return cls(
            device=data.get("device", ""),
            model=data.get("model", ""),
            device_name=data.get("deviceName", ""),
            controllable=data.get("controllable", False),
            retrievable=data.get("retrievable", False),
            supported_commands=data.get("supportCmds", [])
        )


@dataclass
class DeviceState:
    """Represents the current state of a Govee device.
    
    Attributes:
        device: Device MAC address
        model: Device model name
        properties: List of device properties (online status, power state, brightness, color, etc.)
    """
    device: str
    model: str
    properties: List[Dict[str, Any]]
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DeviceState":
        """Create a DeviceState instance from API response data."""
        return cls(
            device=data.get("device", ""),
            model=data.get("model", ""),
            properties=data.get("properties", [])
        )
    
    def get_property(self, key: str) -> Optional[Any]:
        """Get a specific property value from the device state.
        
        Args:
            key: Property key to retrieve (e.g., 'powerState', 'brightness', 'color')
            
        Returns:
            The property value if found, None otherwise
        """
        for prop in self.properties:
            if key in prop:
                return prop[key]
        return None
    
    @property
    def is_online(self) -> Optional[bool]:
        """Check if the device is online."""
        return self.get_property("online")
    
    @property
    def power_state(self) -> Optional[str]:
        """Get the power state ('on' or 'off')."""
        return self.get_property("powerState")
    
    @property
    def brightness(self) -> Optional[int]:
        """Get the brightness level (0-100)."""
        return self.get_property("brightness")
    
    @property
    def color(self) -> Optional[Dict[str, int]]:
        """Get the color as RGB dict (e.g., {'r': 255, 'g': 0, 'b': 0})."""
        return self.get_property("color")
