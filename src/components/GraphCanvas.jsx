import React, { useEffect, useRef, useState, useCallback } from 'react';
import './GraphCanvas.css';

// Layout nodes in a circle with some variation
function computeLayout(nodes, width = 580, height = 420) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) * 0.68;
  const positions = {};
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    positions[n] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
  return positions;
}

function getZoneColor(zone) {
  if (zone === 'Zone A') return '#6366f1';
  if (zone === 'Zone B') return '#06b6d4';
  return '#4f5e78';
}

function interpolateColor(c1, c2, t) {
  // c1/c2 as hex → rgb interpolate
  const hex = (h) => [
    parseInt(h.slice(1,3),16),
    parseInt(h.slice(3,5),16),
    parseInt(h.slice(5,7),16),
  ];
  const [r1,g1,b1] = hex(c1);
  const [r2,g2,b2] = hex(c2);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `rgb(${r},${g},${b})`;
}

export default function GraphCanvas({ nodes, edges, result, mode = 'before', animated = false }) {
  const svgRef = useRef();
  const [dims, setDims] = useState({ w: 580, h: 420 });
  const [hovered, setHovered] = useState(null);
  const [animProgress, setAnimProgress] = useState(mode === 'before' ? 0 : 1);

  // Resize observer
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.max(300, width), h: Math.max(240, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animate transition between before/after
  useEffect(() => {
    if (!animated) {
      setAnimProgress(mode === 'after' ? 1 : 0);
      return;
    }
    const target = mode === 'after' ? 1 : 0;
    const step = 0.02;
    let raf;
    const tick = () => {
      setAnimProgress(prev => {
        const next = target > 0.5 ? Math.min(1, prev + step) : Math.max(0, prev - step);
        if (next === target) return next;
        raf = requestAnimationFrame(tick);
        return next;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, animated]);

  const positions = computeLayout(nodes, dims.w, dims.h);
  const maxWeight = Math.max(...edges.map(e => e.weight), 1);
  const zones = result?.zones || {};

  // Determine edge type: cut (cross-zone) vs same-zone
  const getEdgeStyle = (edge) => {
    if (!result) {
      return {
        stroke: '#2a3a52',
        strokeWidth: 1.5 + (edge.weight / maxWeight) * 3,
        opacity: 0.7,
      };
    }
    const zA = zones[edge.source];
    const zB = zones[edge.target];
    const isCut = zA && zB && zA !== zB;

    if (mode === 'before') {
      // Before: high-cost = red, low-cost = muted
      const t = edge.weight / maxWeight;
      const col = interpolateColor('#2a3a52', '#ef4444', t);
      return { stroke: col, strokeWidth: 1.5 + t * 3, opacity: 0.75 };
    } else {
      // After: cut edges (optimized) = green bright, uncut = muted
      const blend = animProgress;
      if (isCut) {
        const col = interpolateColor('#ef4444', '#22c55e', blend);
        return { stroke: col, strokeWidth: 2 + blend * 1.5, opacity: 0.6 + blend * 0.35, dash: false };
      } else {
        return { stroke: '#1a2840', strokeWidth: 1.5, opacity: 0.35, dash: true };
      }
    }
  };

  const getNodeColor = (node) => {
    if (!result) return '#253348';
    const zone = zones[node];
    if (!zone) return '#253348';
    const baseCol = getZoneColor(zone);
    if (mode === 'before') return '#253348';
    // Fade in zone color on "after"
    return baseCol;
  };

  const getNodeGlow = (node) => {
    if (mode !== 'after' || !result) return '';
    const zone = zones[node];
    if (!zone) return '';
    if (zone === 'Zone A') return 'filter: drop-shadow(0 0 8px rgba(99,102,241,0.7));';
    return 'filter: drop-shadow(0 0 8px rgba(6,182,212,0.7));';
  };

  return (
    <div className="graph-canvas-wrap">
      {/* Legend */}
      <div className="graph-legend">
        {mode === 'before' ? (
          <>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#2a3a52' }} />Low cost</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }} />High cost</span>
          </>
        ) : (
          <>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#6366f1' }} />Zone A</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#06b6d4' }} />Zone B</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#22c55e' }} />Optimized route</span>
          </>
        )}
      </div>

      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="graph-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filters */}
          <filter id="glow-indigo">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-cyan">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Grid pattern */}
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth="0.5"/>
          </pattern>
        </defs>

        {/* Background grid */}
        <rect width={dims.w} height={dims.h} fill="url(#grid)" />

        {/* Edges */}
        {edges.map((edge, i) => {
          const p1 = positions[edge.source];
          const p2 = positions[edge.target];
          if (!p1 || !p2) return null;
          const style = getEdgeStyle(edge);
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          return (
            <g key={`e-${i}`}>
              <line
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
                strokeDasharray={style.dash ? '5,5' : 'none'}
                className="graph-edge"
              />
              {/* Weight label */}
              <rect
                x={midX - 14} y={midY - 9}
                width={28} height={16}
                rx={4} ry={4}
                fill="rgba(8,12,20,0.8)"
              />
              <text
                x={midX} y={midY + 3}
                textAnchor="middle"
                fill={style.stroke}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                {edge.weight}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions[node];
          if (!pos) return null;
          const nodeColor = getNodeColor(node);
          const zone = zones[node];
          const isHovered = hovered === node;
          const glowFilter = mode === 'after' && zone === 'Zone A' ? 'url(#glow-indigo)' :
                             mode === 'after' && zone === 'Zone B' ? 'url(#glow-cyan)' : '';

          return (
            <g
              key={`n-${node}`}
              transform={`translate(${pos.x},${pos.y})`}
              onMouseEnter={() => setHovered(node)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
              filter={glowFilter}
            >
              {/* Outer ring */}
              <circle
                r={isHovered ? 30 : 26}
                fill="rgba(8,12,20,0.6)"
                stroke={nodeColor !== '#253348' ? nodeColor : 'rgba(99,102,241,0.3)'}
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="node-ring"
              />
              {/* Inner fill */}
              <circle r={20} fill={nodeColor} className="node-fill" />
              {/* Label */}
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="9"
                fontFamily="Inter, sans-serif"
                fontWeight="700"
                letterSpacing="0.02em"
              >
                {node.length > 7 ? node.slice(0, 6) + '…' : node}
              </text>
              {/* Zone badge */}
              {zone && mode === 'after' && (
                <text
                  y={35}
                  textAnchor="middle"
                  fill={getZoneColor(zone)}
                  fontSize="8"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                  opacity={animProgress}
                >
                  {zone}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
