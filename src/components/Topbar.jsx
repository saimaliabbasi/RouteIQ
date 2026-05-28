import React, { useEffect, useState } from 'react';
import './Topbar.css';

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="topbar-clock mono">{time}</span>;
}

export default function Topbar({ apiOnline }) {
  return (
    <header className="topbar">
      {/* ── Brand ── */}
      <div className="topbar-brand">
        <div className="brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9" />
            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
          </svg>
        </div>
        <div>
          <span className="brand-name">RouteIQ</span>
          <span className="brand-sub">Logistics Intelligence Platform</span>
        </div>
      </div>

      {/* ── Nav ── */}
      <div className="topbar-center">
        <nav className="topbar-nav">
          <a className="nav-link active" href="#">Dashboard</a>
          <a className="nav-link" href="#">Analytics</a>
          <a className="nav-link" href="#">History</a>
          <a className="nav-link" href="#">Docs</a>
        </nav>
      </div>

      {/* ── Right cluster ── */}
      <div className="topbar-right">
        <LiveClock />

        <div className="topbar-divider" />

        <div className={`api-status ${apiOnline === null ? 'checking' : apiOnline ? 'online' : 'offline'}`}>
          <span className="status-dot" />
          <span className="status-text">
            {apiOnline === null ? 'Connecting…' : apiOnline ? 'Engine Online' : 'Engine Offline'}
          </span>
        </div>

        <div className="topbar-divider" />

        <div className="topbar-avatar" title="Saim Ali Abbasi">SA</div>
      </div>
    </header>
  );
}
