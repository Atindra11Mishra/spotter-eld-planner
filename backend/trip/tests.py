from django.test import SimpleTestCase

from trip.services.hos_calculator import HOSCalculator, HOSLimitError


class HOSCalculatorTests(SimpleTestCase):
    def test_short_valid_trip_generates_24_hour_log_day(self):
        schedule = HOSCalculator(cycle_hours_used=0).plan(
            dist_to_pickup=20,
            mins_to_pickup=30,
            dist_to_dropoff=20,
            mins_to_dropoff=30,
        )

        self.assertEqual(schedule["total_days"], 1)
        self.assertEqual(schedule["days"][0]["total_hours"], 24)
        self.assertTrue(schedule["days"][0]["is_valid_24h"])
        self.assertEqual(schedule["cycle_hours_used_final"], 3)

    def test_multi_day_trip_splits_logs_and_keeps_each_day_at_24_hours(self):
        schedule = HOSCalculator(cycle_hours_used=10).plan(
            dist_to_pickup=180,
            mins_to_pickup=216,
            dist_to_dropoff=1600,
            mins_to_dropoff=1800,
        )

        self.assertGreater(schedule["total_days"], 1)
        self.assertTrue(all(day["is_valid_24h"] for day in schedule["days"]))
        self.assertTrue(any(stop["type"] == "rest" for stop in schedule["stops"]))
        self.assertTrue(any(stop["type"] == "fuel" for stop in schedule["stops"]))

    def test_trip_too_short_is_rejected(self):
        with self.assertRaises(ValueError):
            HOSCalculator(cycle_hours_used=0).plan(
                dist_to_pickup=0,
                mins_to_pickup=0,
                dist_to_dropoff=0,
                mins_to_dropoff=0,
            )

    def test_cycle_limit_rejects_impossible_trip(self):
        with self.assertRaises(HOSLimitError):
            HOSCalculator(cycle_hours_used=69).plan(
                dist_to_pickup=100,
                mins_to_pickup=120,
                dist_to_dropoff=500,
                mins_to_dropoff=600,
            )
