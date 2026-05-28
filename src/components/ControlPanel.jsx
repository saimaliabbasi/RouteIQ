import React from 'react';
import './ControlPanel.css';

function ProgressSection({ status, progress, progressLabel, iterations, runtime }) {
  const isRunning = status === 'running_baseline' || status === 'running_engine';

  return (
    <div className="progress-section glass">
      <div className="prog-header">
        <span className="label">Engine Status</span>
        {isRunning && <span className="spinner" />}
      </div>

      <div className={`prog-status-text ${status}`}>
        {status === 'idle'             && '◉ Ready to optimize'}
        {status === 'running_baseline' && '⟳ Running classical baseline…'}
        {status === 'running_engine'   && '⚡ Optimization engine active…'}
        {status === 'done'             && '✓ Optimization complete'}
        {status === 'error'            && '✗ Engine error'}
      </div>

      {(isRunning || status === 'done') && (
        <>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
                background: status === 'running_engine'
                  ? 'linear-gradient(90deg, #6366f1, #06b6d4)'
                  : 'linear-gradient(90deg, #4f5e78, #8b99b5)',
              }}
            />
          </div>
          <div className="prog-meta">
            <span className="mono">{progressLabel || (status === 'done' ? 'Complete' : '')}</span>
            <span className="mono">{progress.toFixed(0)}%</span>
          </div>
        </>
      )}

      <div className="prog-stats">
        <div className="prog-stat">
          <span className="stat-label">Iterations</span>
          <span className="stat-val mono">{iterations || '—'}</span>
        </div>
        <div className="prog-stat">
          <span className="stat-label">Runtime</span>
          <span className="stat-val mono">{runtime ? `${runtime}s` : '—'}</span>
        </div>
        <div className="prog-stat">
          <span className="stat-label">Convergence</span>
          <span className="stat-val mono">{status === 'done' ? 'Stable' : '—'}</span>
        </div>
      </div>
    </div>
  );
}

export default function ControlPanel({
  status, progress, progressLabel, iterations, runtime, error,
  baselineResult, engineResult, showComparison,
  onRunBaseline, onRunEngine, onCompare, onReset,
}) {
  const isRunning = status === 'running_baseline' || status === 'running_engine';

  return (
    <div className="control-panel">
      <div className="section-header">
        <div className="icon-wrap">⚙</div>
        <h3>Optimization Control</h3>
      </div>

      {/* Action buttons */}
      <div className="ctrl-buttons">
        <button
          id="btn-baseline"
          className="btn btn-ghost ctrl-btn"
          onClick={onRunBaseline}
          disabled={isRunning}
          data-tooltip="Run greedy classical baseline"
        >
          <span>▶</span>
          Classical Baseline
          {baselineResult && <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>Done</span>}
        </button>

        <button
          id="btn-engine"
          className="btn btn-primary ctrl-btn"
          onClick={onRunEngine}
          disabled={isRunning}
          data-tooltip="Run hybrid optimization engine"
        >
          {isRunning && status === 'running_engine' ? (
            <><span className="spinner-sm" /> Running…</>
          ) : (
            <><span>⚡</span>Run Optimized Engine</>
          )}
          {engineResult && <span className="badge badge-success" style={{ marginLeft: 'auto' }}>Done</span>}
        </button>

        <button
          id="btn-compare"
          className="btn btn-cyan ctrl-btn"
          onClick={onCompare}
          disabled={isRunning}
          data-tooltip="Run both methods and compare"
        >
          <span>⇄</span>
          Compare Results
        </button>

        <button
          id="btn-reset"
          className="btn btn-ghost ctrl-btn"
          onClick={onReset}
          disabled={isRunning}
          style={{ opacity: 0.6 }}
        >
          <span>↺</span>
          Reset to Demo Data
        </button>
      </div>

      {/* Progress */}
      <ProgressSection
        status={status}
        progress={progress}
        progressLabel={progressLabel}
        iterations={iterations}
        runtime={runtime}
      />

      {/* Error */}
      {error && (
        <div className="ctrl-error glass animate-fadeIn">
          <span className="error-icon">⚠</span>
          <div>
            <strong>Engine Error</strong>
            <p style={{ marginTop: 3 }}>{error}</p>
            <p style={{ marginTop: 4, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Make sure the API server is running: <span className="mono">uvicorn api:app --reload</span>
            </p>
          </div>
        </div>
      )}

      {/* Method info */}
      <div className="method-info glass">
        <div className="method-row">
          <span className="method-badge baseline">Classical</span>
          <span className="method-desc">Greedy zone partition — deterministic, instant</span>
        </div>
        <div className="divider" />
        <div className="method-row">
          <span className="method-badge engine">Engine</span>
          <span className="method-desc">Variational optimization — iterative convergence</span>
        </div>
      </div>
    </div>
  );
}
