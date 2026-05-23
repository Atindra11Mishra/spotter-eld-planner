"""
FMCSA Hours of Service calculator for the Spotter ELD planner.

Assumptions from the assessment:
- Property-carrying CMV.
- 70-hour / 8-day cycle.
- No adverse driving conditions.
- Fuel at least once every 1,000 miles.
- Pickup and dropoff each take 1 hour on duty, not driving.
"""

MAX_DRIVING = 11 * 60
MAX_WINDOW = 14 * 60
MIN_OFF_DUTY = 10 * 60
MAX_CYCLE = 70 * 60
BREAK_THRESHOLD = 8 * 60
BREAK_DURATION = 30

FUEL_INTERVAL = 1000
FUEL_DURATION = 30
ACTIVITY_DURATION = 60
START_MINUTE = 6 * 60
DAY_MINUTES = 24 * 60

STATUS_KEYS = [
    "off_duty",
    "sleeper_berth",
    "driving",
    "on_duty_not_driving",
]


class HOSLimitError(ValueError):
    """Raised when the requested trip cannot be completed under the assumptions."""


class HOSCalculator:
    def __init__(self, cycle_hours_used: float):
        self.initial_cycle_used = int(round(cycle_hours_used * 60))
        self.cycle_used = self.initial_cycle_used
        self.t = START_MINUTE
        self.shift_start = START_MINUTE
        self.shift_drive = 0
        self.drive_break = 0

        self.entries = []
        self.stops = []
        self.remarks = []
        self.rules = {
            "11_hour_driving_limit": {
                "label": "11-hour driving limit",
                "citation": "49 CFR 395.3(a)(3)",
                "passed": True,
            },
            "14_hour_window": {
                "label": "14-hour driving window",
                "citation": "49 CFR 395.3(a)(2)",
                "passed": True,
            },
            "10_hour_rest": {
                "label": "10-hour off-duty reset",
                "citation": "49 CFR 395.3(a)(1)",
                "passed": True,
            },
            "30_minute_break": {
                "label": "30-minute break after 8 driving hours",
                "citation": "49 CFR 395.3(a)(3)(ii)",
                "passed": True,
            },
            "70_hour_cycle": {
                "label": "70-hour / 8-day cycle",
                "citation": "49 CFR 395.3(b)",
                "passed": True,
            },
        }

    def plan(
        self,
        dist_to_pickup: float,
        mins_to_pickup: int,
        dist_to_dropoff: float,
        mins_to_dropoff: int,
        locations: dict | None = None,
    ) -> dict:
        if self.initial_cycle_used >= MAX_CYCLE:
            raise HOSLimitError("Driver has no remaining cycle hours under the 70-hour / 8-day rule.")

        if dist_to_pickup + dist_to_dropoff < 1 or mins_to_pickup + mins_to_dropoff < 5:
            raise ValueError("Trip is too short to generate a meaningful ELD route plan.")

        self._remark("start", "Trip started", self._location_label(locations, "current"))
        self._drive_with_fuel(dist_to_pickup, mins_to_pickup, "Drive to pickup")

        self._on_duty_nd(ACTIVITY_DURATION, "pickup", "Pickup/loading", self._location_label(locations, "pickup"))

        self._drive_with_fuel(dist_to_dropoff, mins_to_dropoff, "Drive to dropoff")

        self._on_duty_nd(ACTIVITY_DURATION, "dropoff", "Dropoff/unloading", self._location_label(locations, "dropoff"))
        self._remark("end", "Trip completed", self._location_label(locations, "dropoff"))

        return self._compile()

    def _ensure_cycle_available(self, duration: int):
        if self.cycle_used + duration > MAX_CYCLE:
            self.rules["70_hour_cycle"]["passed"] = False
            remaining = round((MAX_CYCLE - self.cycle_used) / 60, 2)
            raise HOSLimitError(
                f"Trip cannot be completed: only {remaining} cycle hours remain under the 70-hour / 8-day rule."
            )

    def _add_entry(self, status: str, t0: int, t1: int, label: str = "", reason: str = ""):
        if t0 >= t1:
            return

        start_day, _ = divmod(t0, DAY_MINUTES)
        end_day, end_min = divmod(t1, DAY_MINUTES)

        if end_min == 0 and end_day > start_day:
            end_day -= 1

        if start_day == end_day:
            self.entries.append({
                "day": start_day,
                "status": status,
                "start": t0 - start_day * DAY_MINUTES,
                "end": t1 - start_day * DAY_MINUTES,
                "label": label,
                "reason": reason,
            })
            return

        boundary = (start_day + 1) * DAY_MINUTES
        self._add_entry(status, t0, boundary, label, reason)
        self._add_entry(status, boundary, t1, label, reason)

    def _stop(self, stop_type: str, minute: int, duration: int, reason: str, label: str, location: str = ""):
        self.stops.append({
            "type": stop_type,
            "minute": minute,
            "duration_h": round(duration / 60, 2),
            "reason": reason,
            "label": label,
            "location": location,
        })
        self._remark(stop_type, label, location, minute, reason)

    def _remark(self, event_type: str, label: str, location: str = "", minute: int | None = None, reason: str = ""):
        self.remarks.append({
            "day": (self.t if minute is None else minute) // DAY_MINUTES,
            "minute": (self.t if minute is None else minute) % DAY_MINUTES,
            "type": event_type,
            "label": label,
            "location": location,
            "reason": reason,
        })

    def _rest(self, reason: str):
        t0 = self.t
        self._add_entry("off_duty", t0, t0 + MIN_OFF_DUTY, "10-hour rest", reason)
        self._stop("rest", t0, MIN_OFF_DUTY, reason, "10-hour off-duty rest")
        self.t += MIN_OFF_DUTY
        self.shift_start = self.t
        self.shift_drive = 0
        self.drive_break = 0

    def _break30(self):
        reason = "Required after 8 cumulative hours of driving without a qualifying break."
        t0 = self.t
        self._add_entry("off_duty", t0, t0 + BREAK_DURATION, "30-minute break", reason)
        self._stop("break", t0, BREAK_DURATION, reason, "30-minute break")
        self.t += BREAK_DURATION
        self.drive_break = 0

    def _on_duty_nd(self, duration: int, label: str, description: str, location: str = ""):
        if self.t - self.shift_start + duration > MAX_WINDOW:
            self._rest("14-hour driving window would be exceeded before the next on-duty activity.")

        self._ensure_cycle_available(duration)

        t0 = self.t
        self._add_entry("on_duty_not_driving", t0, t0 + duration, description, label)
        self._stop(label, t0, duration, label, description, location)
        self.t += duration
        self.cycle_used += duration

    def _drive(self, minutes: int, label: str):
        remaining = minutes
        guard = 0

        while remaining > 0:
            guard += 1
            if guard > 10000:
                raise RuntimeError("HOS calculator exceeded safety iteration limit.")

            if self.drive_break >= BREAK_THRESHOLD:
                self._break30()

            window_left = MAX_WINDOW - (self.t - self.shift_start)
            drive_left = MAX_DRIVING - self.shift_drive
            cycle_left = MAX_CYCLE - self.cycle_used
            break_left = BREAK_THRESHOLD - self.drive_break

            if cycle_left <= 0:
                self.rules["70_hour_cycle"]["passed"] = False
                raise HOSLimitError("Trip cannot continue: 70-hour / 8-day cycle limit reached.")

            if drive_left <= 0:
                self._rest("11-hour driving limit reached.")
                continue

            if window_left <= 0:
                self._rest("14-hour driving window reached.")
                continue

            chunk = min(remaining, drive_left, window_left, cycle_left, break_left)
            if chunk <= 0:
                self._rest("A required HOS limit was reached before more driving could be logged.")
                continue

            self._add_entry("driving", self.t, self.t + chunk, label, "Route driving time from OSRM.")
            self.t += chunk
            self.shift_drive += chunk
            self.drive_break += chunk
            self.cycle_used += chunk
            remaining -= chunk

    def _drive_with_fuel(self, dist_miles: float, dur_minutes: int, label: str):
        if dist_miles <= 0 or dur_minutes <= 0:
            return

        remaining_miles = dist_miles
        remaining_mins = dur_minutes

        while remaining_miles > 0 and remaining_mins > 0:
            chunk_miles = min(remaining_miles, FUEL_INTERVAL)

            if remaining_miles <= FUEL_INTERVAL:
                chunk_mins = remaining_mins
            else:
                chunk_mins = max(1, int(round(chunk_miles / dist_miles * dur_minutes)))

            chunk_mins = min(chunk_mins, remaining_mins)
            self._drive(chunk_mins, label)

            remaining_miles -= chunk_miles
            remaining_mins -= chunk_mins

            if remaining_miles > 0:
                self._on_duty_nd(FUEL_DURATION, "fuel", "Fuel stop", "")

    def _compile(self) -> dict:
        if not self.entries:
            return {
                "days": [],
                "stops": self.stops,
                "remarks": self.remarks,
                "rules": self.rules,
                "total_drive_hours": 0,
                "total_days": 0,
                "cycle_hours_used_final": round(self.cycle_used / 60, 2),
            }

        first_day = min(entry["day"] for entry in self.entries)
        last_day = max(entry["day"] for entry in self.entries)
        entries_by_day = {day: [] for day in range(first_day, last_day + 1)}

        for entry in self.entries:
            entries_by_day.setdefault(entry["day"], []).append(entry)

        days_out = []
        for day_idx in range(first_day, last_day + 1):
            entries = sorted(entries_by_day.get(day_idx, []), key=lambda e: (e["start"], e["end"]))
            filled_entries = self._fill_off_duty_gaps(day_idx, entries)
            totals = {status: 0 for status in STATUS_KEYS}

            for entry in filled_entries:
                totals[entry["status"]] += entry["end"] - entry["start"]

            total_minutes = sum(totals.values())
            day_remarks = sorted(
                [remark for remark in self.remarks if remark["day"] == day_idx],
                key=lambda remark: remark["minute"],
            )

            days_out.append({
                "day": day_idx,
                "entries": filled_entries,
                "remarks": day_remarks,
                "totals_hours": {key: round(value / 60, 2) for key, value in totals.items()},
                "total_hours": round(total_minutes / 60, 2),
                "is_valid_24h": total_minutes == DAY_MINUTES,
            })

        total_drive_mins = sum(
            entry["end"] - entry["start"]
            for entry in self.entries
            if entry["status"] == "driving"
        )

        return {
            "days": days_out,
            "stops": self.stops,
            "remarks": self.remarks,
            "rules": self.rules,
            "total_drive_hours": round(total_drive_mins / 60, 2),
            "total_days": len(days_out),
            "cycle_hours_used_final": round(self.cycle_used / 60, 2),
        }

    def _fill_off_duty_gaps(self, day_idx: int, entries: list[dict]) -> list[dict]:
        filled = []
        cursor = 0

        for entry in entries:
            if entry["start"] > cursor:
                filled.append({
                    "day": day_idx,
                    "status": "off_duty",
                    "start": cursor,
                    "end": entry["start"],
                    "label": "Off duty",
                    "reason": "Unlogged time is treated as off duty for the daily log sheet.",
                })
            filled.append(entry)
            cursor = max(cursor, entry["end"])

        if cursor < DAY_MINUTES:
            filled.append({
                "day": day_idx,
                "status": "off_duty",
                "start": cursor,
                "end": DAY_MINUTES,
                "label": "Off duty",
                "reason": "Remaining time after trip activity is off duty.",
            })

        return filled

    def _location_label(self, locations: dict | None, key: str) -> str:
        if not locations or key not in locations:
            return ""

        display_name = locations[key].get("display_name", "")
        parts = [part.strip() for part in display_name.split(",") if part.strip()]
        if len(parts) >= 2:
            return f"{parts[0]}, {parts[-2]}"
        return display_name
