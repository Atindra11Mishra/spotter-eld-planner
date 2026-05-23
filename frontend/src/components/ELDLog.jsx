const STATUS_ROWS = [
  ["off_duty", "1. Off Duty"],
  ["sleeper_berth", "2. Sleeper Berth"],
  ["driving", "3. Driving"],
  ["on_duty_not_driving", "4. On Duty"],
];

const ROW_Y = {
  off_duty: 120,
  sleeper_berth: 158,
  driving: 196,
  on_duty_not_driving: 234,
};

const GRID_LEFT = 128;
const GRID_RIGHT = 980;
const GRID_TOP = 100;
const GRID_BOTTOM = 253;
const GRID_WIDTH = GRID_RIGHT - GRID_LEFT;

function xFromMinute(minute) {
  return GRID_LEFT + (minute / 1440) * GRID_WIDTH;
}

function timeLabel(minute) {
  const hour = Math.floor(minute / 60);
  const mins = minute % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function formatTotal(hours) {
  return Number(hours || 0).toFixed(2);
}

function remarkText(remark) {
  const place = remark.location ? ` - ${remark.location}` : "";
  const reason = remark.reason && !["pickup", "dropoff", "fuel"].includes(remark.reason)
    ? ` (${remark.reason})`
    : "";
  return `${timeLabel(remark.minute)} ${remark.label}${place}${reason}`;
}

export default function ELDLog({ schedule }) {
  const days = schedule?.days || [];

  if (!days.length) {
    return (
      <section className="eld-panel empty-eld">
        <p className="eyebrow">Daily Logs</p>
        <h2>FMCSA-style log sheets will appear here</h2>
        <p className="muted">
          Each planned trip generates one SVG duty-status grid per day, with remarks,
          row totals, and a 24-hour validation check.
        </p>
      </section>
    );
  }

  return (
    <section className="eld-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Daily Logs</p>
          <h2>{days.length} FMCSA-style log sheet{days.length === 1 ? "" : "s"}</h2>
        </div>
        <div className="log-meta">
          <span>{schedule.total_drive_hours} driving hrs</span>
          <span>{schedule.cycle_hours_used_final} cycle hrs used</span>
        </div>
      </div>

      <div className="log-stack">
        {days.map((day) => (
          <article className="log-sheet" key={day.day}>
            <div className="log-sheet-header">
              <div>
                <p className="eyebrow">Driver's Daily Log</p>
                <h3>Day {day.day + 1}</h3>
              </div>
              <div className={day.is_valid_24h ? "valid-badge" : "invalid-badge"}>
                Total lines: {formatTotal(day.total_hours)} / 24.00 hrs
              </div>
            </div>

            <div className="log-scroll" tabIndex="0" aria-label={`Day ${day.day + 1} ELD log sheet`}>
              <svg className="log-form-svg" viewBox="0 0 1080 610" role="img">
                <rect x="0" y="0" width="1080" height="610" fill="#fff" />
                <text x="20" y="32" className="form-title">Drivers Daily Log</text>
                <text x="192" y="32" className="form-small">Day {day.day + 1}</text>

                <FormLine x1="20" x2="270" y="58" label="From:" />
                <FormLine x1="330" x2="610" y="58" label="To:" />
                <FormLine x1="670" x2="1040" y="58" label="Name of carrier or carriers" />
                <FormLine x1="20" x2="390" y="86" label="Truck/tractor and trailer numbers or license plate/state" />
                <FormLine x1="430" x2="1040" y="86" label="Main office address" />

                <rect x={GRID_LEFT} y={GRID_TOP - 22} width={GRID_WIDTH} height="22" fill="#0b1220" />
                <text x={GRID_LEFT - 58} y={GRID_TOP - 6} className="grid-header-label">Mid-night</text>
                <text x={GRID_LEFT + GRID_WIDTH / 2 - 12} y={GRID_TOP - 6} className="grid-header-text">Noon</text>
                <text x={GRID_RIGHT - 42} y={GRID_TOP - 6} className="grid-header-text">Mid-night</text>
                <text x="1005" y={GRID_TOP - 6} className="grid-total-title">Total Hours</text>

                {STATUS_ROWS.map(([key, label]) => (
                  <g key={key}>
                    <text x="20" y={ROW_Y[key] + 5} className="row-label">{label}</text>
                    <line x1={GRID_LEFT} x2={GRID_RIGHT} y1={ROW_Y[key]} y2={ROW_Y[key]} className="status-line" />
                    <text x="1016" y={ROW_Y[key] + 5} className="row-total">
                      {formatTotal(day.totals_hours[key])}
                    </text>
                  </g>
                ))}

                {Array.from({ length: 97 }, (_, index) => {
                  const minute = index * 15;
                  const x = xFromMinute(minute);
                  const isHour = index % 4 === 0;
                  const isMajor = index % 24 === 0;
                  const tickTop = isHour ? GRID_TOP - 16 : GRID_TOP - 9;
                  const tickBottom = isHour ? GRID_BOTTOM + 16 : GRID_BOTTOM + 9;
                  return (
                    <g key={index}>
                      <line
                        x1={x}
                        x2={x}
                        y1={tickTop}
                        y2={tickBottom}
                        className={isMajor ? "hour-line major" : isHour ? "hour-line" : "quarter-line"}
                      />
                      {isHour && index < 96 && (
                        <text x={x + 3} y={GRID_TOP - 6} className="hour-top-label">
                          {index / 4 === 0 ? "1" : index / 4 <= 12 ? String(index / 4) : String(index / 4 - 12)}
                        </text>
                      )}
                    </g>
                  );
                })}

                <rect x={GRID_LEFT} y={GRID_TOP - 18} width={GRID_WIDTH} height={GRID_BOTTOM - GRID_TOP + 36} fill="none" className="grid-border" />

                {day.entries.map((entry, index) => {
                  const y = ROW_Y[entry.status];
                  const x1 = xFromMinute(entry.start);
                  const x2 = xFromMinute(entry.end);
                  return (
                    <g key={`${entry.status}-${entry.start}-${entry.end}-${index}`}>
                      <line x1={x1} x2={x2} y1={y} y2={y} className={`duty-segment ${entry.status}`} />
                      {index > 0 && <line x1={x1} x2={x1} y1={ROW_Y[day.entries[index - 1].status]} y2={y} className="status-change-line" />}
                      <title>{entry.label}: {timeLabel(entry.start)} to {timeLabel(entry.end)}</title>
                    </g>
                  );
                })}

                <text x="20" y="292" className="remarks-title">Remarks</text>
                <rect x="20" y="306" width="1020" height="190" fill="none" className="remarks-box" />
                {(day.remarks.length ? day.remarks : [{ minute: 0, label: "No duty status changes recorded", location: "", reason: "" }]).slice(0, 7).map((remark, index) => (
                  <text x="36" y={334 + index * 22} className="remarks-text" key={`${remark.type || "remark"}-${index}`}>
                    {remarkText(remark)}
                  </text>
                ))}

                <text x="20" y="532" className="form-small">Shipping Documents:</text>
                <line x1="150" x2="430" y1="532" y2="532" className="form-line" />
                <text x="20" y="560" className="form-small">Driver signature:</text>
                <line x1="150" x2="430" y1="560" y2="560" className="form-line" />
                <text x="792" y="532" className={day.is_valid_24h ? "total-check ok" : "total-check bad"}>
                  Total of all lines: {formatTotal(day.total_hours)} hrs
                </text>
                <text x="792" y="560" className={day.is_valid_24h ? "total-check ok" : "total-check bad"}>
                  {day.is_valid_24h ? "24-hour check passed" : "Review required"}
                </text>
              </svg>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FormLine({ x1, x2, y, label }) {
  return (
    <g>
      <text x={x1} y={y - 6} className="form-small">{label}</text>
      <line x1={x1} x2={x2} y1={y} y2={y} className="form-line" />
    </g>
  );
}
