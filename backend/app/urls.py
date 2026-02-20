from datetime import timedelta

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from django.utils import timezone

from app.models import H5075HistoricalMeasurement


def health(_: object) -> JsonResponse:
    return JsonResponse({"status": "ok"})


def history_values(request: object) -> JsonResponse:
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

    queryset = H5075HistoricalMeasurement.objects.all().order_by("measured_at")

    if address:
        queryset = queryset.filter(address__iexact=address)

    if hours is not None:
        cutoff = timezone.now() - timedelta(hours=hours)
        queryset = queryset.filter(measured_at__gte=cutoff)

    rows = list(queryset[:limit])

    points = [
        {
            "address": row.address,
            "name": row.name,
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


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health),
    path("api/history/", history_values),
]
