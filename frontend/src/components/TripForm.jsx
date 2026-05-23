import { useState } from "react";

const EXAMPLE_TRIP = {
  current_location: "Chicago, IL",
  pickup_location: "Indianapolis, IN",
  dropoff_location: "Dallas, TX",
  cycle_hours_used: "18",
};

const MAX_CYCLE = 70;

function LocationIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 2.5 3.5 8.5 4.5 8.5S12.5 8.5 12.5 6A4.5 4.5 0 0 0 8 1.5z" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="6" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M11 8h2l2 2v2h-4V8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="4" cy="12.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="12.5" cy="12.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{width:14,height:14}}>
      <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

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

  const cycleVal = Math.min(MAX_CYCLE, Math.max(0, parseFloat(form.cycle_hours_used) || 0));
  const cyclePct = (cycleVal / MAX_CYCLE) * 100;

  return (
    <form onSubmit={handleSubmit} className="trip-form">
      <div>
        <p className="eyebrow">Trip Inputs</p>
        <h2 style={{marginBottom: 0}}>Build a plan</h2>
      </div>

      <label className="field-label">
        <span>Current location</span>
        <div className="input-wrap">
          <LocationIcon />
          <input
            className="field-input"
            value={form.current_location}
            onChange={update("current_location")}
            placeholder="Chicago, IL"
            required
          />
        </div>
      </label>

      <label className="field-label">
        <span>Pickup location</span>
        <div className="input-wrap">
          <BoxIcon />
          <input
            className="field-input"
            value={form.pickup_location}
            onChange={update("pickup_location")}
            placeholder="Indianapolis, IN"
            required
          />
        </div>
      </label>

      <label className="field-label">
        <span>Dropoff location</span>
        <div className="input-wrap">
          <TruckIcon />
          <input
            className="field-input"
            value={form.dropoff_location}
            onChange={update("dropoff_location")}
            placeholder="Dallas, TX"
            required
          />
        </div>
      </label>

      <label className="field-label">
        <span>Current cycle used (hrs)</span>
        <div className="input-wrap">
          <ClockIcon />
          <input
            className="field-input"
            type="number"
            min="0"
            max="70"
            step="0.25"
            value={form.cycle_hours_used}
            onChange={update("cycle_hours_used")}
            placeholder="18"
            required
          />
        </div>
        <div className="cycle-bar-wrap">
          <div className="cycle-bar-track">
            <div className="cycle-bar-fill" style={{ width: `${cyclePct}%` }} />
          </div>
          <div className="cycle-bar-labels">
            <span>0 hr</span>
            <span>{cycleVal > 0 ? `${cycleVal} hr used` : ""}</span>
            <span>70 hr limit</span>
          </div>
        </div>
      </label>

      <div className="assumption-box">
        <strong>Assessment assumptions</strong>
        <p>Property-carrying driver, 70 hrs / 8 days, no adverse conditions.</p>
        <p>Fuel at least every 1,000 miles. Pickup and dropoff take 1 hour each.</p>
      </div>

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? (
            <>
              <span className="btn-spinner" />
              Calculating...
            </>
          ) : (
            <>
              <CheckIcon />
              Plan trip
            </>
          )}
        </button>
        <button type="button" className="secondary-button" onClick={loadExample} disabled={loading}>
          Use sample
        </button>
      </div>
    </form>
  );
}
