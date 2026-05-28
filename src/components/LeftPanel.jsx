import React, { useState } from 'react';
import UploadCSV from './UploadCSV';
import './LeftPanel.css';

export default function LeftPanel({ nodes, edges, onLoad, onAddEdge, onRemoveEdge }) {
  const [newSrc, setNewSrc]    = useState('');
  const [newTgt, setNewTgt]    = useState('');
  const [newWgt, setNewWgt]    = useState('');
  const [addError, setAddError] = useState('');

  const handleAdd = () => {
    setAddError('');
    if (!newSrc.trim() || !newTgt.trim()) { setAddError('Source and target are required.'); return; }
    const w = parseFloat(newWgt);
    if (isNaN(w) || w <= 0)              { setAddError('Weight must be a positive number.'); return; }
    if (newSrc.trim() === newTgt.trim()) { setAddError('Source and target must differ.'); return; }
    if (nodes.length >= 12)             { setAddError('Maximum 12 nodes supported.'); return; }
    onAddEdge({ source: newSrc.trim(), target: newTgt.trim(), weight: w });
    setNewSrc(''); setNewTgt(''); setNewWgt('');
  };

  const totalCost  = edges.reduce((s, e) => s + e.weight, 0);
  const density    = nodes.length > 1 ? (2 * edges.length) / (nodes.length * (nodes.length - 1)) : 0;

  return (
    <div className="left-panel">
      {/* Upload */}
      <div className="panel-section">
        <div className="section-header">
          <div className="icon-wrap">📁</div>
          <h3>Import Data</h3>
        </div>
        <UploadCSV onLoad={onLoad} />
      </div>

      <div className="divider" />

      {/* Network stats */}
      <div className="panel-section">
        <div className="section-header">
          <div className="icon-wrap">📊</div>
          <h3>Network Summary</h3>
        </div>
        <div className="net-stats">
          <div className="net-stat">
            <span className="stat-label">Nodes (Hubs)</span>
            <span className="stat-num">{nodes.length}</span>
          </div>
          <div className="net-stat">
            <span className="stat-label">Routes</span>
            <span className="stat-num">{edges.length}</span>
          </div>
          <div className="net-stat">
            <span className="stat-label">Total Cost</span>
            <span className="stat-num">{totalCost.toFixed(1)}</span>
          </div>
          <div className="net-stat">
            <span className="stat-label">Density</span>
            <span className="stat-num">{(density * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Add route manually */}
      <div className="panel-section">
        <div className="section-header">
          <div className="icon-wrap">➕</div>
          <h3>Add Route</h3>
        </div>
        <div className="add-edge-form">
          <div>
            <label className="label">Source Hub</label>
            <input
              className="input"
              placeholder="e.g. Hub_A"
              value={newSrc}
              onChange={e => setNewSrc(e.target.value)}
              list="node-list-src"
            />
            <datalist id="node-list-src">
              {nodes.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Target Hub</label>
            <input
              className="input"
              placeholder="e.g. Hub_B"
              value={newTgt}
              onChange={e => setNewTgt(e.target.value)}
              list="node-list-tgt"
            />
            <datalist id="node-list-tgt">
              {nodes.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Route Cost / Weight</label>
            <input
              className="input"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="e.g. 5.0"
              value={newWgt}
              onChange={e => setNewWgt(e.target.value)}
            />
          </div>
          {addError && <div className="add-error">{addError}</div>}
          <button id="btn-add-route" className="btn btn-ghost" onClick={handleAdd} style={{ width: '100%' }}>
            ＋ Add Route
          </button>
        </div>
      </div>

      <div className="divider" />

      {/* Edge list */}
      <div className="panel-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="section-header">
          <div className="icon-wrap">🗺</div>
          <h3>Route List</h3>
          <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>{edges.length}</span>
        </div>
        <div className="edge-list">
          {edges.map((e, i) => (
            <div key={i} className="edge-item">
              <div className="edge-route">
                <span className="edge-node">{e.source}</span>
                <span className="edge-arrow">→</span>
                <span className="edge-node">{e.target}</span>
              </div>
              <div className="edge-meta">
                <span className="edge-weight mono">{e.weight}</span>
                <button
                  className="btn btn-danger edge-del"
                  onClick={() => onRemoveEdge(i)}
                  title="Remove route"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
