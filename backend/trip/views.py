import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .services.geocoder import geocode
from .services.hos_calculator import HOSCalculator, HOSLimitError
from .services.router import get_route


@csrf_exempt
@require_POST
def plan_trip(request):
    try:
        body = json.loads(request.body)
        current_location = body["current_location"]
        pickup_location = body["pickup_location"]
        dropoff_location = body["dropoff_location"]
        cycle_hours_used = float(body.get("cycle_hours_used", 0))
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    if cycle_hours_used < 0 or cycle_hours_used > 70:
        return JsonResponse({"error": "Current cycle used must be between 0 and 70 hours."}, status=400)

    try:
        current_geo = geocode(current_location)
        pickup_geo = geocode(pickup_location)
        dropoff_geo = geocode(dropoff_location)
    except Exception as exc:
        return JsonResponse({"error": f"Geocoding failed: {exc}"}, status=502)

    try:
        leg1 = get_route(current_geo, pickup_geo)
        leg2 = get_route(pickup_geo, dropoff_geo)
    except Exception as exc:
        return JsonResponse({"error": f"Routing failed: {exc}"}, status=502)

    try:
        calculator = HOSCalculator(cycle_hours_used=cycle_hours_used)
        schedule = calculator.plan(
            dist_to_pickup=leg1["distance_miles"],
            mins_to_pickup=leg1["duration_minutes"],
            dist_to_dropoff=leg2["distance_miles"],
            mins_to_dropoff=leg2["duration_minutes"],
            locations={
                "current": current_geo,
                "pickup": pickup_geo,
                "dropoff": dropoff_geo,
            },
        )
    except HOSLimitError as exc:
        return JsonResponse({"error": str(exc)}, status=422)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({"error": f"HOS calculation failed: {exc}"}, status=500)

    return JsonResponse({
        "locations": {
            "current": current_geo,
            "pickup": pickup_geo,
            "dropoff": dropoff_geo,
        },
        "legs": {
            "to_pickup": {
                "distance_miles": leg1["distance_miles"],
                "duration_minutes": leg1["duration_minutes"],
            },
            "to_dropoff": {
                "distance_miles": leg2["distance_miles"],
                "duration_minutes": leg2["duration_minutes"],
            },
        },
        "geometry": leg1["geometry"] + leg2["geometry"],
        "schedule": schedule,
    })
