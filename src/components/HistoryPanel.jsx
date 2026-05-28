import React, { useState } from 'react';
import './HistoryPanel.css';

function formatTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
}

function JobCard({ job, index, onRestore }) {
  const [expanded, setExpanded] = useState(false);
  const pct = job.improvement_percent ?? 0;
  const isGood = pct >= 40;
  const isMid  = pct >= 20 && pct < 40;

  return (
    <div className={`hist-card ${expanded ? 'expanded' : ''}`}>
      <div className="hist-card-header" onClick={() => setExpanded(p => !p)}>
        <div className="hist-card-left">
          <span className={`hist-pct-badge ${isGood ? 'good' : isMid ? 'mid' : 'low'}`}>
            {pct.toFixed(1)}%
          </span>
          <div className="hist-card-info">
            <span className="hist-job-id mono">#{job.job_id || index}</span>
            <span className="hist-time">{formatTime(job.timestamp)}</span>
          </div>
        </div>
        <div className="hist-card-right">
          <span className="hist-nodes-label">{job.nodes_count}N · {job.edges_count}E</span>
          <span className={`hist-chevron ${expanded ? 'open' : ''}`}>›</span>
        </div>
      </div>

      {expanded && (
        <div className="hist-card-body animate-fadeIn">
          <div className="hist-detail-grid">
            <div className="hist-detail-item">
              <span className="hist-detail-label">Cost Saved</span>
              <span className="hist-detail-val" style={{ color: '#22c55e' }}>
                {job.cost_saved?.toFixed(2) ?? '—'}
              </span>
            </div>
            <div className="hist-detail-item">
              <span className="hist-detail-label">Total Network</span>
              <span className="hist-detail-val">{job.total_cost_evaluated?.toFixed(1) ?? '—'}</span>
            </div>
            <div className="hist-detail-item">
              <span className="hist-detail-label">Runtime</span>
              <span className="hist-detail-val mono">{job.runtime_seconds ?? '—'}s</span>
            </div>
            <div className="hist-detail-item">
              <span className="hist-detail-label">Conv. Steps</span>
              <span className="hist-detail-val mono">{job.convergence?.length ?? '—'}</span>
            </div>
          </div>

          {/* Miniature convergence sparkline */}
          {job.convergence && job.convergence.length > 1 && (
            <MiniSparkline data={job.convergence} />
          )}

          {/* Zone assignment */}
          {job.zones && (
            <div className="hist-zones">
              {Object.entries(job.zones).map(([node, zone]) => (
                <span
                  key={node}
                  className={`hist-zone-chip ${zone === 'Zone A' ? 'zone-a' : 'zone-b'}`}
                >
                  {node}
                </span>
              ))}
            </div>
          )}

          <button
            className="btn btn-ghost hist-restore-btn"
            onClick={() => onRestore && onRestore(job)}
          >
            ↩ Restore This Network
          </button>
        </div>
      )}
    </div>
  );
}

function MiniSparkline({ data }) {
  const w = 240, h = 36, pad = 4;
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const rng = maxV - minV || 1;
  const iw = w - pad * 2;
  const ih = h - pad * 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * iw;
    const y = pad + ih - ((v - minV) / rng) * ih;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="hist-sparkline-wrap">
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="url(#spark-grad)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hist-spark-label">Convergence curve</span>
    </div>
  );
}

export default function HistoryPanel({ jobs = [], onRestore, onClear }) {
  if (jobs.length === 0) {
    return (
      <div className="hist-panel hist-empty">
        <div className="hist-empty-icon">🕐</div>
        <p className="hist-empty-text">No optimization jobs yet.</p>
        <p className="hist-empty-sub">Run the engine to build history.</p>
      </div>
    );
  }

  return (
    <div className="hist-panel">
      <div className="hist-panel-header">
        <span className="hist-count-badge">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-ghost hist-clear-btn" onClick={onClear}>
          ✕ Clear
        </button>
      </div>
      <div className="hist-list">
        {jobs.map((job, i) => (
          <JobCard key={job.job_id || i} job={job} index={i + 1} onRestore={onRestore} />
        ))}
      </div>
    </div>
  );
}
