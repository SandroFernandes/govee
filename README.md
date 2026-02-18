# Govee Device Data Reader

A Python library for reading data from Govee devices using the official Govee Developer API.

## Features

- List all Govee devices associated with your account
- Read current device state (power, brightness, color, etc.)
- Support for all WiFi-enabled Govee devices
- Clean, typed Python API with proper error handling
- Rate limit handling

## Installation

1. Clone this repository:
```bash
git clone https://github.com/SandroFernandes/govee.git
cd govee
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

Or install in development mode:
```bash
pip install -e .
```

## Getting Started

### Prerequisites

You need a Govee API key to use this library. Get one from the [Govee Developer Portal](https://developer.govee.com/).

### Basic Usage

```python
from govee import GoveeClient

# Initialize the client
client = GoveeClient(api_key="your-api-key-here")

# List all devices
devices = client.list_devices()
for device in devices:
    print(f"Device: {device.device_name} ({device.model})")

# Get device state
if devices:
    device = devices[0]
    state = client.get_device_state(device.device, device.model)
    print(f"Power: {state.power_state}")
    print(f"Brightness: {state.brightness}%")
    print(f"Online: {state.is_online}")

# Close the connection
client.close()
```

### Using Context Manager

```python
from govee import GoveeClient

# Automatically handles connection cleanup
with GoveeClient(api_key="your-api-key-here") as client:
    devices = client.list_devices()
    # ... your code here
```

### Environment Variable

For security, use environment variables for your API key:

```bash
export GOVEE_API_KEY='your-api-key-here'
```

```python
import os
from govee import GoveeClient

api_key = os.environ.get("GOVEE_API_KEY")
client = GoveeClient(api_key=api_key)
```

## Example

Run the included example script:

```bash
export GOVEE_API_KEY='your-api-key-here'
python examples/read_devices.py
```

This will list all your devices and their current states.

## API Reference

### GoveeClient

Main client class for interacting with the Govee API.

#### Methods

- `__init__(api_key: str, base_url: Optional[str] = None)` - Initialize the client
- `list_devices() -> List[Device]` - Get all devices
- `get_device_state(device: str, model: str) -> DeviceState` - Get device state
- `close()` - Close the HTTP session

### Device

Represents a Govee device.

**Attributes:**
- `device: str` - Device MAC address
- `model: str` - Device model
- `device_name: str` - Human-readable name
- `controllable: bool` - Whether device can be controlled
- `retrievable: bool` - Whether state can be retrieved
- `supported_commands: List[str]` - Available commands

### DeviceState

Represents the current state of a device.

**Attributes:**
- `device: str` - Device MAC address
- `model: str` - Device model
- `properties: List[Dict]` - List of properties

**Properties:**
- `is_online: Optional[bool]` - Online status
- `power_state: Optional[str]` - Power state ('on'/'off')
- `brightness: Optional[int]` - Brightness (0-100)
- `color: Optional[Dict]` - RGB color dict

### Exceptions

- `GoveeError` - Base exception
- `GoveeAPIError` - API request errors
- `GoveeAuthError` - Authentication failures
- `GoveeRateLimitError` - Rate limit exceeded

## Rate Limits

The Govee API has rate limits (typically 100 requests per minute). The client will raise a `GoveeRateLimitError` when limits are exceeded.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Resources

- [Govee Developer Portal](https://developer.govee.com/)
- [Govee API Documentation](https://govee-public.s3.amazonaws.com/developer-docs/GoveeAPIReference.pdf)