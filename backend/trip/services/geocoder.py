import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "SpotterELDPlanner/1.0"}


def geocode(query: str) -> dict:
    """
    Convert a location string to coordinates.
    Returns: { lat, lon, display_name }
    """
    response = requests.get(
        NOMINATIM_URL,
        params={"q": query, "format": "json", "limit": 1},
        headers=HEADERS,
        timeout=10,
    )
    response.raise_for_status()

    results = response.json()

    if not results:
        raise ValueError(f"Location not found: {query!r}")

    result = results[0]

    return {
        "lat": float(result["lat"]),
        "lon": float(result["lon"]),
        "display_name": result.get("display_name", query),
    }