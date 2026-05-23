import { useState } from 'react'
import './App.css'
import { planTrip } from './api'
import TripForm from './components/TripForm'
import MapView from './components/MapView'
import ELDLog from './components/ELDLog'
import TripSummary from './components/TripSummary'

function App() {
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (payload) => {
    setLoading(true)
    setError('')
    setTripData(null)
    try {
      const data = await planTrip(payload)
      setTripData(data)
    } catch (err) {
      setError({
        message: err.message || 'Unable to plan this trip.',
        code: err.code,
        details: err.details,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Spotter ELD Planner</p>
          <h1>Plan routes and generate compliant ELD logs</h1>
          <p className="header-copy">
            Enter a route, current cycle hours, and the planner will estimate stops,
            HOS timing, and daily duty-status sheets.
          </p>
        </div>
      </header>

      <section className="app-grid">
        <aside className="control-panel">
          <TripForm onSubmit={handleSubmit} loading={loading} />
          {error && <ErrorState error={error} />}
        </aside>

        {loading ? (
          <ResultsSkeleton />
        ) : (
          <>
            <section className="map-panel">
              <MapView data={tripData} />
            </section>

            <TripSummary data={tripData} />
            <ELDLog data={tripData} schedule={tripData?.schedule} />
          </>
        )}
      </section>
    </main>
  )
}

function ErrorState({ error }) {
  const details = error.details || {}
  const isCycleLimit = error.code === 'cycle_limit'

  return (
    <div className="error-message" role="alert">
      <strong>{isCycleLimit ? 'Route exceeds available cycle hours' : 'Planning failed'}</strong>
      <span>{error.message}</span>
      {isCycleLimit && (
        <div className="error-detail-grid">
          <div>
            <small>Cycle used</small>
            <b>{details.cycle_hours_used ?? '70'} hrs</b>
          </div>
          <div>
            <small>Available</small>
            <b>{details.available_cycle_hours ?? 0} hrs</b>
          </div>
          <div>
            <small>Cycle limit</small>
            <b>{details.max_cycle_hours ?? 70} hrs</b>
          </div>
        </div>
      )}
      <small>
        {isCycleLimit
          ? 'Try a lower current cycle value, a shorter route, or explain in the demo that the app correctly blocks trips that exceed the 70-hour cycle.'
          : 'Check spelling for each location, avoid identical stops, and try a practical long-haul route.'}
      </small>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <>
      <section className="map-panel skeleton-panel">
        <div className="skeleton-header">
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
        </div>
        <div className="skeleton-map">
          <span className="skeleton-route" />
          <span className="skeleton-pin pin-a" />
          <span className="skeleton-pin pin-b" />
          <span className="skeleton-pin pin-c" />
        </div>
      </section>

      <section className="summary-panel skeleton-panel">
        <span className="skeleton-line short" />
        <span className="skeleton-line title" />
        <div className="skeleton-metrics">
          <span />
          <span />
          <span />
          <span />
        </div>
        <span className="skeleton-line" />
        <span className="skeleton-line" />
      </section>

      <section className="eld-panel skeleton-panel">
        <span className="skeleton-line short" />
        <span className="skeleton-line title" />
        <div className="skeleton-log">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </section>
    </>
  )
}

export default App
