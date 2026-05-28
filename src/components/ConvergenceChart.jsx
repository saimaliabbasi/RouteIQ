import React, { useEffect, useRef, useState } from 'react';
import './ConvergenceChart.css';

function buildPolyline(data, w, h, padX = 40, padY = 24) {
  if (!data || data.length < 2) return '';
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  return data
    .map((v, i) => {
      const x = padX + (i / (data.length - 1)) * innerW;
      const y = padY + innerH - ((v - minV) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(data, w, h, padX = 40, padY = 24) {
  if (!data || data.length < 2) return '';
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const baseline = padY + innerH;

  const pts = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * innerW;
    const y = padY + innerH - ((v - minV) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const firstX = padX;
  const lastX = padX + innerW;
  return `M ${firstX},${baseline} L ${pts.join(' L ')} L ${lastX},${baseline} Z`;
}

export default function ConvergenceChart({ data, label = 'SPSA Cost Descent', isRunning = false }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 500, h: 180 });
  const [visibleCount, setVisibleCount] = useState(0);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ w: Math.max(280, width), h: 180 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animate drawing the line when data arrives
  useEffect(() => {
    if (!data || data.length === 0) { setVisibleCount(0); return; }
    setVisibleCount(0);
    let frame = 0;
    const total = data.length;
    const speed = Math.max(1, Math.floor(total / 40)); // batch multiple points per frame

    const raf = () => {
      setVisibleCount(prev => {
        const next = Math.min(total, prev + speed);
        if (next < total) requestAnimationFrame(raf);
        return next;
      });
    };
    requestAnimationFrame(raf);
  }, [data]);

  const empty = !data || data.length < 2;
  const visible = empty ? [] : data.slice(0, visibleCount);
  const { w, h } = dims;
  const PAD_X = 44;
  const PAD_Y = 20;

  // Y-axis ticks
  const minV = empty ? 0 : Math.min(...data);
  const maxV = empty ? 1 : Math.max(...data);
  const yTicks = 4;

  const polyline = buildPolyline(visible, w, h, PAD_X, PAD_Y);
  const areaPath = buildAreaPath(visible, w, h, PAD_X, PAD_Y);

  return (
    <div className="conv-chart-wrap glass" ref={containerRef}>
      <div className="conv-chart-header">
        <div className="conv-chart-title">
          <span className="conv-icon">📈</span>
          <span>{label}</span>
          {isRunning && <span className="conv-running-badge">LIVE</span>}
        </div>
        {!empty && (
          <div className="conv-chart-meta">
            <span className="conv-meta-item">
              <span className="conv-meta-label">Start</span>
              <span className="conv-meta-val">{data[0].toFixed(3)}</span>
            </span>
            <span className="conv-meta-sep">→</span>
            <span className="conv-meta-item">
              <span className="conv-meta-label">End</span>
              <span className="conv-meta-val" style={{ color: '#22c55e' }}>{data[data.length - 1].toFixed(3)}</span>
            </span>
            <span className="conv-meta-item">
              <span className="conv-meta-label">Δ</span>
              <span className="conv-meta-val" style={{ color: '#6366f1' }}>
                {(data[0] - data[data.length - 1]).toFixed(3)}
              </span>
            </span>
          </div>
        )}
      </div>

      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="conv-svg">
        <defs>
          <linearGradient id="conv-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="conv-line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="conv-line-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="conv-grid" width="40" height="30" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 30" fill="none" stroke="rgba(99,102,241,0.06)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect x={PAD_X} y={PAD_Y} width={w - PAD_X * 2} height={h - PAD_Y * 2} fill="url(#conv-grid)" />

        {/* Y-axis ticks */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = minV + ((maxV - minV) * i) / yTicks;
          const y = PAD_Y + (h - PAD_Y * 2) - ((val - minV) / (maxV - minV || 1)) * (h - PAD_Y * 2);
          return (
            <g key={i}>
              <line x1={PAD_X - 4} y1={y} x2={w - PAD_X} y2={y}
                stroke="rgba(99,102,241,0.1)" strokeWidth="0.5" strokeDasharray="4,4" />
              <text x={PAD_X - 6} y={y + 4} textAnchor="end"
                fill="rgba(139,153,181,0.6)" fontSize="8" fontFamily="JetBrains Mono, monospace">
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* X-axis label */}
        <text x={w / 2} y={h - 2} textAnchor="middle"
          fill="rgba(139,153,181,0.4)" fontSize="8" fontFamily="Inter, sans-serif">
          Optimization Iterations
        </text>

        {empty ? (
          <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(79,94,120,0.7)" fontSize="12" fontFamily="Inter, sans-serif">
            {isRunning ? 'Collecting convergence data…' : 'Run engine to see convergence curve'}
          </text>
        ) : (
          <>
            {/* Area fill */}
            <path d={areaPath} fill="url(#conv-area-grad)" />

            {/* Line */}
            <polyline
              points={polyline}
              fill="none"
              stroke="url(#conv-line-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#conv-line-glow)"
              className="conv-line"
            />

            {/* End-point dot */}
            {visibleCount >= 2 && (() => {
              const lastIdx = visibleCount - 1;
              const totalIdx = data.length - 1;
              const x = PAD_X + (lastIdx / totalIdx) * (w - PAD_X * 2);
              const y = PAD_Y + (h - PAD_Y * 2) - ((visible[lastIdx] - minV) / (maxV - minV || 1)) * (h - PAD_Y * 2);
              return (
                <circle cx={x} cy={y} r="4" fill="#22c55e"
                  filter="url(#conv-line-glow)" className="conv-endpoint" />
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
}
