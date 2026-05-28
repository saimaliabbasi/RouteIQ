import React from 'react';
import './ResultsPanel.css';

function ZoneTable({ zones }) {
  const zoneA = Object.entries(zones).filter(([, z]) => z === 'Zone A').map(([n]) => n);
  const zoneB = Object.entries(zones).filter(([, z]) => z === 'Zone B').map(([n]) => n);
  return (
    <div className="zone-table">
      <div className="zone-col">
        <div className="zone-header zone-a-hdr">Zone A</div>
        {zoneA.map(n => <div key={n} className="zone-node zone-a-node">{n}</div>)}
      </div>
      <div className="zone-col">
        <div className="zone-header zone-b-hdr">Zone B</div>
        {zoneB.map(n => <div key={n} className="zone-node zone-b-node">{n}</div>)}
      </div>
    </div>
  );
}

function ComparisonTable({ baseline, engine }) {
  const rows = [
    {
      label: 'Delivery Zone Cost',
      baseline: baseline?.cost_saved?.toFixed(2),
      engine: engine?.cost_saved?.toFixed(2),
      unit: 'units',
      better: 'higher',
    },
    {
      label: 'Improvement %',
      baseline: baseline?.improvement_percent?.toFixed(1),
      engine: engine?.improvement_percent?.toFixed(1),
      unit: '%',
      better: 'higher',
    },
    {
      label: 'Total Routes Cost',
      baseline: baseline?.total_cost_evaluated?.toFixed(1),
      engine: engine?.total_cost_evaluated?.toFixed(1),
      unit: 'units',
      better: null,
    },
  ];

  return (
    <div className="cmp-table-wrap">
      <table className="cmp-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Classical Baseline</th>
            <th>Optimization Engine</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const bVal = parseFloat(row.baseline);
            const eVal = parseFloat(row.engine);
            const engineWins = row.better === 'higher' ? eVal > bVal : eVal < bVal;
            return (
              <tr key={row.label}>
                <td className="metric-name">{row.label}</td>
                <td className="metric-val baseline-val">
                  {row.baseline ?? '—'} {row.baseline ? row.unit : ''}
                </td>
                <td className={`metric-val engine-val ${engineWins ? 'winner' : ''}`}>
                  {row.engine ?? '—'} {row.engine ? row.unit : ''}
                  {engineWins && <span className="win-badge">↑ Better</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ResultsPanel({ baseline, engine, showComparison, activeView, onSetView }) {
  const active = activeView === 'after' ? engine : baseline;
  const hasAny = baseline || engine;

  if (!hasAny) {
    return (
      <div className="results-panel empty-results">
        <div className="empty-icon">📊</div>
        <h3>No Results Yet</h3>
        <p>Run the Classical Baseline or Optimization Engine to see route analysis here.</p>
      </div>
    );
  }

  return (
    <div className="results-panel animate-fadeIn">
      {/* Tab switcher */}
      <div className="results-tabs">
        <div className="tabs-left">
          {baseline && (
            <button
              id="tab-before"
              className={`tab-btn ${activeView === 'before' ? 'active' : ''}`}
              onClick={() => onSetView('before')}
            >
              📋 Baseline Result
            </button>
          )}
          {engine && (
            <button
              id="tab-after"
              className={`tab-btn tab-engine ${activeView === 'after' ? 'active' : ''}`}
              onClick={() => onSetView('after')}
            >
              ⚡ Optimized Result
            </button>
          )}
          {showComparison && (
            <button
              id="tab-compare"
              className={`tab-btn tab-cmp ${activeView === 'compare' ? 'active' : ''}`}
              onClick={() => onSetView('compare')}
            >
              ⇄ Comparison
            </button>
          )}
        </div>
        <div className="tabs-right">
          {active && (
            <span className={`badge ${activeView === 'after' ? 'badge-success' : 'badge-primary'}`}>
              {activeView === 'after' ? `${engine?.improvement_percent?.toFixed(1)}% optimized` : 'Baseline'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {activeView === 'compare' && showComparison ? (
        <ComparisonTable baseline={baseline} engine={engine} />
      ) : active ? (
        <div className="result-body">
          {/* Zone assignment */}
          <div className="result-section">
            <h4 className="result-section-title">Route Zone Assignment</h4>
            <ZoneTable zones={active.zones || {}} />
          </div>

          {/* Key metric */}
          <div className="result-section">
            <h4 className="result-section-title">Performance Summary</h4>
            <div className="perf-row">
              <div className="perf-item">
                <span className="perf-label">Optimized Cost</span>
                <span className="perf-val" style={{ color: '#22c55e' }}>
                  {active.cost_saved?.toFixed(2)} <small>units</small>
                </span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Improvement</span>
                <span className="perf-val" style={{ color: '#6366f1' }}>
                  {active.improvement_percent?.toFixed(1)}<small>%</small>
                </span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Total Network Cost</span>
                <span className="perf-val">
                  {active.total_cost_evaluated?.toFixed(1)} <small>units</small>
                </span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Method</span>
                <span className="perf-val" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {activeView === 'after' ? 'Optimization Engine' : 'Classical Baseline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
