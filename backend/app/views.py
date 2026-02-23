from datetime import timedelta
import json

from django.contrib.auth import authenticate, login, logout
from django.http import HttpRequest, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from app.models import H5075DeviceAlias, H5075HistoricalMeasurement


def health(_: object) -> JsonResponse:
    return JsonResponse({"status": "ok"})


@require_GET
def auth_session(request: HttpRequest) -> JsonResponse:
    if request.user.is_authenticated:
        return JsonResponse({"logged_in": True, "username": request.user.get_username()})
    return JsonResponse({"logged_in": False, "username": ""})


@require_GET
@ensure_csrf_cookie
def auth_csrf(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
def auth_login(request: HttpRequest) -> JsonResponse:
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    if not username or not password:
        return JsonResponse({"error": "'username' and 'password' are required."}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid credentials."}, status=401)

    login(request, user)
    return JsonResponse({"logged_in": True, "username": user.get_username()})


@require_POST
def auth_logout(request: HttpRequest) -> JsonResponse:
    logout(request)
    return JsonResponse({"logged_in": False, "username": ""})


def history_values(request: HttpRequest) -> JsonResponse:
    address = (request.GET.get("address", "") or "").strip()
    hours_raw = (request.GET.get("hours", "") or "").strip()
    limit_raw = (request.GET.get("limit", "2000") or "2000").strip()

    try:
        limit = int(limit_raw)
    except ValueError:
        return JsonResponse({"error": "Invalid 'limit'. Use an integer."}, status=400)

    if limit <= 0:
        return JsonResponse({"error": "Invalid 'limit'. Must be > 0."}, status=400)

    limit = min(limit, 10000)

    hours: int | None = None
    if hours_raw:
        try:
            hours = int(hours_raw)
        except ValueError:
            return JsonResponse({"error": "Invalid 'hours'. Use an integer."}, status=400)

        if hours <= 0:
            return JsonResponse({"error": "Invalid 'hours'. Must be > 0."}, status=400)

    queryset = H5075HistoricalMeasurement.objects.all().order_by("-measured_at")

    if address:
        queryset = queryset.filter(address__iexact=address)

    if hours is not None:
        cutoff = timezone.now() - timedelta(hours=hours)
        queryset = queryset.filter(measured_at__gte=cutoff)

    rows = list(queryset[:limit])
    rows.reverse()
    address_keys = {(row.address or "").strip().lower() for row in rows if row.address}
    alias_map = {item.address.lower(): item.display_name for item in H5075DeviceAlias.objects.filter(address__in=address_keys)}

    points = [
        {
            "address": row.address,
            "name": alias_map.get((row.address or "").strip().lower(), row.name),
            "measured_at": row.measured_at.isoformat(),
            "temperature_c": float(row.temperature_c),
            "humidity_pct": float(row.humidity_pct),
        }
        for row in rows
    ]

    return JsonResponse(
        {
            "count": len(points),
            "filters": {
                "address": address or None,
                "hours": hours,
                "limit": limit,
            },
            "points": points,
        }
    )


def devices(request: HttpRequest) -> JsonResponse:
    if request.method == "POST":
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required."}, status=401)

        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON body."}, status=400)

        address = str(payload.get("address", "")).strip().lower()
        alias = str(payload.get("alias", "")).strip()

        if not address:
            return JsonResponse({"error": "'address' is required."}, status=400)

        if len(alias) > 128:
            return JsonResponse({"error": "'alias' max length is 128."}, status=400)

        row, _ = H5075DeviceAlias.objects.get_or_create(address=address)
        row.alias = alias
        row.save(update_fields=["alias", "updated_at"])

        return JsonResponse(
            {
                "address": row.address,
                "alias": row.alias,
                "detected_name": row.detected_name,
                "display_name": row.display_name,
                "updated_at": row.updated_at.isoformat(),
            }
        )

    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    rows = list(H5075DeviceAlias.objects.all().order_by("alias", "detected_name", "address"))
    payload = [
        {
            "address": row.address,
            "alias": row.alias,
            "detected_name": row.detected_name,
            "display_name": row.display_name,
            "updated_at": row.updated_at.isoformat(),
        }
        for row in rows
    ]
    return JsonResponse({"count": len(payload), "devices": payload})
