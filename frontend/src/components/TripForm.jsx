import { useState } from "react";

const EXAMPLE_TRIP = {
  current_location: "Chicago, IL",
  pickup_location: "Indianapolis, IN",
  dropoff_location: "Dallas, TX",
  cycle_hours_used: "18",
};

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    cycle_hours_used: "",
  });

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function loadExample() {
    if (loading) return;
    setForm(EXAMPLE_TRIP);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      cycle_hours_used: Number.parseFloat(form.cycle_hours_used) || 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="trip-form">
      <div className="panel-heading">
        <p className="eyebrow">Trip Inputs</p>
        <h2>Build a plan</h2>
      </div>

      <label>
        <span>Current location</span>
        <input
          value={form.current_location}
          onChange={update("current_location")}
          placeholder="Chicago, IL"
          required
        />
      </label>

      <label>
        <span>Pickup location</span>
        <input
          value={form.pickup_location}
          onChange={update("pickup_location")}
          placeholder="Indianapolis, IN"
          required
        />
      </label>

      <label>
        <span>Dropoff location</span>
        <input
          value={form.dropoff_location}
          onChange={update("dropoff_location")}
          placeholder="Dallas, TX"
          required
        />
      </label>

      <label>
        <span>Current cycle used (hrs)</span>
        <input
          type="number"
          min="0"
          max="70"
          step="0.25"
          value={form.cycle_hours_used}
          onChange={update("cycle_hours_used")}
          placeholder="18"
          required
        />
      </label>

      <div className="assumption-box">
        <strong>Assessment assumptions</strong>
        <p>Property-carrying driver, 70 hrs / 8 days, no adverse conditions.</p>
        <p>Fuel at least every 1,000 miles. Pickup and dropoff take 1 hour each.</p>
      </div>

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "Calculating route..." : "Plan trip"}
        </button>
        <button type="button" className="secondary-button" onClick={loadExample} disabled={loading}>
          Use sample
        </button>
      </div>
    </form>
  );
}
