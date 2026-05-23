function hours(minutes) {
  return `${(minutes / 60).toFixed(1)} hr`;
}

function miles(value) {
  return `${Math.round(value).toLocaleString()} mi`;
}

function minuteLabel(absMin) {
  const day = Math.floor(absMin / 1440) + 1;
  const minute = absMin % 1440;
  const hour = Math.floor(minute / 60);
  const mins = minute % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `Day ${day}, ${hour % 12 || 12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function routeName(location) {
  return location?.display_name?.split(",").slice(0, 2).join(", ") || "Unknown";
}

export default function TripSummary({ data }) {
  if (!data) {
    return (
      <section className="summary-panel">
        <p className="eyebrow">Trip Summary</p>
        <h2>No plan generated yet</h2>
        <p className="muted">Submit the form to calculate route distance, drive time, HOS events, and log sheets.</p>
        <div className="empty-summary-list">
          <span>Distance and drive-time totals</span>
          <span>Rule checks with CFR references</span>
          <span>Pickup, fuel, break, rest, and dropoff timeline</span>
        </div>
      </section>
    );
  }

  const toPickup = data.legs.to_pickup;
  const toDropoff = data.legs.to_dropoff;
  const totalMiles = toPickup.distance_miles + toDropoff.distance_miles;
  const totalMinutes = toPickup.duration_minutes + toDropoff.duration_minutes;
  const stops = data.schedule.stops || [];
  const rules = Object.values(data.schedule.rules || {});
  const events = [
    {
      type: "start",
      label: "Start",
      detail: routeName(data.locations.current),
      minute: 360,
    },
    ...stops,
  ];

  return (
    <section className="summary-panel">
      <p className="eyebrow">Trip Summary</p>
      <h2>{miles(totalMiles)} over {data.schedule.total_days} log day{data.schedule.total_days === 1 ? "" : "s"}</h2>

      <div className="metric-grid">
        <Metric label="Route distance" value={miles(totalMiles)} />
        <Metric label="OSRM drive time" value={hours(totalMinutes)} />
        <Metric label="HOS drive time" value={`${data.schedule.total_drive_hours} hr`} />
        <Metric label="Cycle after trip" value={`${data.schedule.cycle_hours_used_final} hr`} />
      </div>

      <div className="route-breakdown">
        <div>
          <span>{routeName(data.locations.current)} to pickup</span>
          <strong>{miles(toPickup.distance_miles)} / {hours(toPickup.duration_minutes)}</strong>
        </div>
        <div>
          <span>Pickup to {routeName(data.locations.dropoff)}</span>
          <strong>{miles(toDropoff.distance_miles)} / {hours(toDropoff.duration_minutes)}</strong>
        </div>
      </div>

      <div className="compliance-card">
        <h3>HOS compliance checks</h3>
        <div className="compliance-list">
          {rules.map((rule) => (
            <div key={rule.citation} className={rule.passed ? "rule-pass" : "rule-fail"}>
              <span>{rule.passed ? "Pass" : "Review"}</span>
              <strong>{rule.label}</strong>
              <small>{rule.citation}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="timeline-card">
        <h3>Route events</h3>
        <div className="event-timeline">
          {events.map((event, index) => (
            <div key={`${event.type}-${event.minute}-${index}`} className="timeline-event">
              <i className={`timeline-dot ${event.type}`} />
              <div>
                <strong>{event.label || event.type}</strong>
                <span>{minuteLabel(event.minute)}{event.duration_h ? ` - ${event.duration_h} hr` : ""}</span>
                <small>{event.location || event.detail || event.reason || ""}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
