"""Example script demonstrating how to read data from Govee devices."""

import os
from govee import GoveeClient


def main():
    # Get API key from environment variable
    api_key = os.environ.get("GOVEE_API_KEY")
    
    if not api_key:
        print("Error: GOVEE_API_KEY environment variable not set")
        print("Please set your Govee API key:")
        print("  export GOVEE_API_KEY='your-api-key-here'")
        return
    
    # Create client using context manager (automatically closes connection)
    with GoveeClient(api_key) as client:
        print("=" * 60)
        print("Govee Device Data Reader")
        print("=" * 60)
        print()
        
        # List all devices
        print("Fetching devices...")
        try:
            devices = client.list_devices()
            print(f"Found {len(devices)} device(s):\n")
            
            for i, device in enumerate(devices, 1):
                print(f"Device {i}:")
                print(f"  Name: {device.device_name}")
                print(f"  Model: {device.model}")
                print(f"  MAC: {device.device}")
                print(f"  Controllable: {device.controllable}")
                print(f"  Retrievable: {device.retrievable}")
                print(f"  Supported Commands: {', '.join(device.supported_commands)}")
                print()
                
                # Get device state if retrievable
                if device.retrievable:
                    try:
                        print(f"  Fetching state for {device.device_name}...")
                        state = client.get_device_state(device.device, device.model)
                        
                        print(f"  Online: {state.is_online}")
                        print(f"  Power State: {state.power_state}")
                        
                        if state.brightness is not None:
                            print(f"  Brightness: {state.brightness}%")
                        
                        if state.color is not None:
                            color = state.color
                            print(f"  Color: RGB({color.get('r', 0)}, {color.get('g', 0)}, {color.get('b', 0)})")
                        
                        # Show all properties
                        print(f"  All Properties:")
                        for prop in state.properties:
                            for key, value in prop.items():
                                print(f"    - {key}: {value}")
                        
                        print()
                        
                    except Exception as e:
                        print(f"  Error getting state: {e}")
                        print()
                else:
                    print(f"  (State not retrievable for this device)")
                    print()
                    
        except Exception as e:
            print(f"Error: {e}")
            return
    
    print("=" * 60)
    print("Done!")


if __name__ == "__main__":
    main()
