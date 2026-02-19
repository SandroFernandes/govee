from __future__ import annotations

from dataclasses import dataclass


GOVEE_H5075_MFR_ID = 0xEC88


@dataclass(frozen=True)
class H5075Reading:
    address: str
    name: str
    temperature_c: float
    humidity_pct: float
    battery_pct: int
    error: bool
    rssi: int | None = None


@dataclass(frozen=True)
class H5075AdvertisementData:
    address: str
    name: str
    manufacturer_id: int
    payload_hex: str
    service_uuids: tuple[str, ...]
    temperature_c: float
    humidity_pct: float
    battery_pct: int
    error: bool
    rssi: int | None = None


def decode_temp_humid(temp_humid_bytes: bytes) -> tuple[float, float]:
    base_num = (temp_humid_bytes[0] << 16) + (temp_humid_bytes[1] << 8) + temp_humid_bytes[2]
    is_negative = bool(base_num & 0x800000)
    temp_as_int = base_num & 0x7FFFFF
    temperature_c = int(temp_as_int / 1000) / 10.0
    humidity_pct = (temp_as_int % 1000) / 10.0

    if is_negative:
        temperature_c = -temperature_c

    return temperature_c, humidity_pct


def decode_temp_humid_battery_error(payload: bytes) -> tuple[float, float, int, bool]:
    temperature_c, humidity_pct = decode_temp_humid(payload[0:3])
    battery_pct = int(payload[-1] & 0x7F)
    has_error = bool(payload[-1] & 0x80)
    return temperature_c, humidity_pct, battery_pct, has_error


def parse_h5075_manufacturer_data(
    address: str,
    local_name: str,
    manufacturer_id: int,
    data: bytes,
    rssi: int | None,
) -> H5075Reading | None:
    is_h5075_name = "H5075" in local_name
    if len(data) != 6 or not (is_h5075_name or manufacturer_id == GOVEE_H5075_MFR_ID):
        return None

    temperature_c, humidity_pct, battery_pct, has_error = decode_temp_humid_battery_error(data[1:5])

    if temperature_c < -40 or temperature_c > 100:
        return None

    return H5075Reading(
        address=address,
        name=local_name or "H5075",
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        battery_pct=battery_pct,
        error=has_error,
        rssi=rssi,
    )


def parse_h5075_advertisement_data(
    address: str,
    local_name: str,
    manufacturer_id: int,
    data: bytes,
    rssi: int | None,
    service_uuids: list[str] | None = None,
) -> H5075AdvertisementData | None:
    reading = parse_h5075_manufacturer_data(
        address=address,
        local_name=local_name,
        manufacturer_id=manufacturer_id,
        data=data,
        rssi=rssi,
    )
    if reading is None:
        return None

    return H5075AdvertisementData(
        address=reading.address,
        name=reading.name,
        manufacturer_id=manufacturer_id,
        payload_hex=data.hex(),
        service_uuids=tuple(service_uuids or []),
        temperature_c=reading.temperature_c,
        humidity_pct=reading.humidity_pct,
        battery_pct=reading.battery_pct,
        error=reading.error,
        rssi=reading.rssi,
    )
