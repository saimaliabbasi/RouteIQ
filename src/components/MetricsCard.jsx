import React, { useEffect, useRef } from 'react';
import './MetricsCard.css';

/* ── Animated counter hook ── */
function useCountUp(target, duration = 900) {
  const ref = useRef(null);
  useEffect(() => {
    if (target == null || isNaN(target)) return;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      if (ref.current) ref.current.textContent = current.toFixed(1);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return ref;
}

function MetricCard({ id, icon, label, value, rawValue, sub, color, badge, delta }) {
  const noData = value === '—';
  const countRef = useCountUp(noData ? null : rawValue, 800);

  return (
    <div className={`metric-card glass ${noData ? 'metric-empty' : 'metric-active'}`} id={`metric-${id}`}>
      {/* Glow accent bar */}
      {!noData && <div className="metric-accent-bar" style={{ background: color }} />}

      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
        {badge && !noData && (
          <span className="badge badge-success metric-badge">{badge}</span>
        )}
        {delta != null && !noData && (
          <span
            className={`metric-delta ${delta >= 0 ? 'delta-pos' : 'delta-neg'}`}
            title="vs classical baseline"
          >
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="metric-value-row">
        {noData ? (
          <span className="metric-value muted">—</span>
        ) : (
          <>
            <span className="metric-value" style={{ color }} ref={countRef}>
              {rawValue?.toFixed(1)}
            </span>
            <span className="metric-unit" style={{ color }}>{value.replace(/[\d.]/g, '').trim()}</span>
          </>
        )}
      </div>

      {!noData && (
        <div className="metric-bar-wrap">
          <div
            className="metric-bar-fill"
            style={{
              width: `${Math.min(100, rawValue)}%`,
              background: `linear-gradient(90deg, ${color}80, ${color})`,
            }}
          />
        </div>
      )}

      <div className="metric-sub">{sub}</div>
    </div>
  );
}

export default function MetricsCard({ baseline, engine }) {
  const noData  = !baseline && !engine;
  const active  = engine || baseline;
  const isEngine = !!engine;

  const costPct   = active?.improvement_percent ?? 0;
  const costSaved = active?.cost_saved ?? 0;
  const totalCost = active?.total_cost_evaluated ?? 0;
  const timeSaved = costPct * 0.65;
  const fuelSaved = costPct * 0.48;

  // Delta vs baseline (only meaningful when both exist)
  const costDelta = (engine && baseline)
    ? engine.improvement_percent - baseline.improvement_percent
    : null;

  const cards = [
    {
      id: 'cost',
      icon: '💰',
      label: 'Cost Reduction',
      value:    noData ? '—' : `${costPct.toFixed(1)} %`,
      rawValue: noData ? null : costPct,
      sub:      noData ? 'Run optimization to see results' : `${costSaved.toFixed(1)} units saved`,
      color:    '#22c55e',
      badge:    isEngine ? 'Optimized' : null,
      delta:    costDelta,
    },
    {
      id: 'time',
      icon: '⏱',
      label: 'Time Savings (est.)',
      value:    noData ? '—' : `${timeSaved.toFixed(1)} %`,
      rawValue: noData ? null : timeSaved,
      sub:      noData ? 'Based on route efficiency' : 'Est. delivery time reduction',
      color:    '#6366f1',
      badge:    null,
      delta:    null,
    },
    {
      id: 'fuel',
      icon: '⛽',
      label: 'Fuel Efficiency (est.)',
      value:    noData ? '—' : `${fuelSaved.toFixed(1)} %`,
      rawValue: noData ? null : fuelSaved,
      sub:      noData ? 'Cross-zone route reduction' : 'Est. fuel cost savings',
      color:    '#06b6d4',
      badge:    null,
      delta:    null,
    },
    {
      id: 'routes',
      icon: '🗺',
      label: 'Network Load',
      value:    noData ? '—' : `${totalCost.toFixed(0)} units`,
      rawValue: noData ? null : Math.min(100, (costSaved / (totalCost || 1)) * 100),
      sub:      noData ? 'Upload data & run' : `Total weighted route cost: ${totalCost.toFixed(1)}`,
      color:    '#f59e0b',
      badge:    null,
      delta:    null,
    },
  ];

  return (
    <div className="metrics-grid">
      {cards.map(card => (
        <MetricCard key={card.id} {...card} />
      ))}
    </div>
  );
}
