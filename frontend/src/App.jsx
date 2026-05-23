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
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-brand">
          <svg className="topbar-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="1" y="10" width="15" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none"/>
            <path d="M16 14h4l2 3v3h-6v-6z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
            <circle cx="5.5" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            <circle cx="18.5" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          </svg>
          <span className="topbar-name">Spotter ELD Planner</span>
        </div>
        <div className="topbar-meta">
          <span className="topbar-chip">70-hr / 8-day cycle</span>
          <span className="topbar-chip">Property carrier</span>
          <span className="topbar-chip chip-blue">FMCSA 395.8</span>
        </div>
      </header>

      <main className="app-body">
        <aside className="control-panel">
          <TripForm onSubmit={handleSubmit} loading={loading} />
          {error && <ErrorState error={error} />}
        </aside>

        <div className="results-area">
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
        </div>
      </main>
    </div>
  )
}

function ErrorState({ error }) {
  const details = error.details || {}
  const isCycleLimit = error.code === 'cycle_limit'

  return (
    <div className="error-message" role="alert">
      <div className="error-title-row">
        <svg viewBox="0 0 20 20" fill="currentColor" className="error-icon" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
        </svg>
        <strong>{isCycleLimit ? 'Route exceeds available cycle hours' : 'Planning failed'}</strong>
      </div>
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
