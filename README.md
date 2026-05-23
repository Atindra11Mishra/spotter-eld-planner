# Spotter ELD Planner

A full-stack trip planning app for the Spotter AI Full Stack Developer assessment. Drivers enter current, pickup, and dropoff locations plus current cycle hours used; the app returns an OSRM route, required HOS stops, and FMCSA-style daily ELD log sheets.

Live demo: _add Vercel URL after deployment_

Backend API: _add Railway URL after deployment_

## Features

- Geocodes trip locations with Nominatim.
- Routes current to pickup and pickup to dropoff with OSRM.
- Generates a property-carrying CMV HOS schedule under the 70-hour / 8-day assumption.
- Adds pickup/dropoff on-duty time, fuel stops, 30-minute breaks, and 10-hour rests.
- Renders an interactive React-Leaflet map using OpenStreetMap tiles.
- Draws FMCSA-style SVG daily log sheets with duty rows, remarks, totals, and 24-hour validation.
- Shows trip summary, route event timeline, and compliance checks with CFR citations.

## Tech Stack

Backend:

- Django
- Django REST Framework
- django-cors-headers
- requests
- gunicorn

Frontend:

- React
- Vite
- Axios
- React-Leaflet
- Leaflet
- OpenStreetMap tiles

External services:

- Nominatim for geocoding
- OSRM public demo server for routing
- OpenStreetMap for map tiles

## Local Setup

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
python manage.py runserver 127.0.0.1:8000
```

The API runs at:

```text
http://127.0.0.1:8000/api/trip/plan/
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

During local development, Vite proxies `/api` to `http://localhost:8000`.

## API Reference

### Plan Trip

```http
POST /api/trip/plan/
Content-Type: application/json
```

Request:

```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Indianapolis, IN",
  "dropoff_location": "Dallas, TX",
  "cycle_hours_used": 18
}
```

Response shape:

```json
{
  "locations": {
    "current": {
      "lat": 41.8755616,
      "lon": -87.6244212,
      "display_name": "Chicago, Illinois, United States"
    },
    "pickup": {
      "lat": 39.7683331,
      "lon": -86.1583502,
      "display_name": "Indianapolis, Indiana, United States"
    },
    "dropoff": {
      "lat": 32.7762719,
      "lon": -96.7968559,
      "display_name": "Dallas, Texas, United States"
    }
  },
  "legs": {
    "to_pickup": {
      "distance_miles": 180.72,
      "duration_minutes": 216
    },
    "to_dropoff": {
      "distance_miles": 899.61,
      "duration_minutes": 950
    }
  },
  "geometry": [[-87.624351, 41.875563]],
  "schedule": {
    "days": [
      {
        "day": 0,
        "entries": [
          {
            "status": "driving",
            "start": 360,
            "end": 576,
            "label": "Drive to pickup",
            "reason": "Route driving time from OSRM."
          }
        ],
        "remarks": [],
        "totals_hours": {
          "off_duty": 12,
          "sleeper_berth": 0,
          "driving": 11,
          "on_duty_not_driving": 1
        },
        "total_hours": 24,
        "is_valid_24h": true
      }
    ],
    "stops": [],
    "rules": {},
    "total_drive_hours": 11.93,
    "total_days": 2,
    "cycle_hours_used_final": 31.93
  }
}
```

Common errors:

- `400`: invalid request, same/too-short trip, or cycle hours outside `0-70`.
- `422`: trip cannot be completed with the remaining 70-hour cycle budget.
- `502`: geocoding or routing provider failure.

## HOS Rules Implemented

The calculator models the assessment's property-carrying CMV assumptions:

- 11-hour driving limit: `49 CFR 395.3(a)(3)`
- 14-hour driving window: `49 CFR 395.3(a)(2)`
- 10 consecutive hours off duty before a new shift: `49 CFR 395.3(a)(1)`
- 30-minute break after 8 cumulative driving hours: `49 CFR 395.3(a)(3)(ii)`
- 70-hour / 8-day cycle limit: `49 CFR 395.3(b)`

Assessment assumptions:

- No adverse driving conditions.
- Fuel stop at least once every 1,000 miles.
- Pickup takes 1 hour on duty, not driving.
- Dropoff takes 1 hour on duty, not driving.
- Driver starts at 6:00 AM on Day 1.

Important limitation: the assessment input gives only current cycle hours used, not a full previous 8-day duty recap. The app enforces the remaining 70-hour budget from that input, but it does not reconstruct a rolling 8-day recap history.

## Deployment

### Backend on Railway

Recommended settings:

- Root directory: `backend/`
- Start command: from `Procfile`
- Environment variables:

```text
SECRET_KEY=<secure-random-string>
DEBUG=False
```

The Procfile runs:

```bash
gunicorn config.wsgi --bind 0.0.0.0:$PORT
```

### Frontend on Vercel

Recommended settings:

- Root directory: `frontend/`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:

```text
VITE_API_URL=<Railway backend URL>
```

Example:

```text
VITE_API_URL=https://your-railway-app.up.railway.app
```

## Verification

Backend:

```bash
cd backend
python manage.py check
python manage.py test trip
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Sample trip for reviewer testing:

```text
Current: Chicago, IL
Pickup: Indianapolis, IN
Dropoff: Dallas, TX
Current cycle used: 18
```
