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
      setError(err.message || 'Unable to plan this trip.')
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
          {error && <ErrorState message={error} />}
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

function ErrorState({ message }) {
  return (
    <div className="error-message" role="alert">
      <strong>Planning failed</strong>
      <span>{message}</span>
      <small>
        Check spelling for each location, avoid identical stops, and keep current cycle hours below the 70-hour limit.
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
