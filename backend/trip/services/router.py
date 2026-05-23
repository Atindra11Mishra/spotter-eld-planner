import requests

OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"
METERS_PER_MILE = 1609.344


def get_route(origin: dict, destination: dict) -> dict:
    """
    Get driving route between two coordinates.
    origin / destination: { lat, lon }
    Returns: { distance_miles, duration_minutes, geometry }
    """
    coords = f"{origin['lon']},{origin['lat']};{destination['lon']},{destination['lat']}"

    response = requests.get(
        f"{OSRM_BASE}/{coords}",
        params={"overview": "full", "geometries": "geojson"},
        timeout=15,
    )
    response.raise_for_status()

    data = response.json()

    if data.get("code") != "Ok":
        raise ValueError(f"Routing failed: {data.get('message', 'unknown error')}")

    route = data["routes"][0]

    return {
        "distance_miles": round(route["distance"] / METERS_PER_MILE, 2),
        "duration_minutes": int(route["duration"] / 60),
        "geometry": route["geometry"]["coordinates"],  # [[lon, lat], ...]
    }