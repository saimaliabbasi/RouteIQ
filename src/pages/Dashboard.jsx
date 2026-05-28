import React, { useCallback, useState } from 'react';
import LeftPanel       from '../components/LeftPanel';
import GraphCanvas     from '../components/GraphCanvas';
import ControlPanel    from '../components/ControlPanel';
import MetricsCard     from '../components/MetricsCard';
import ResultsPanel    from '../components/ResultsPanel';
import ConvergenceChart from '../components/ConvergenceChart';
import HistoryPanel    from '../components/HistoryPanel';
import { useOptimization } from '../hooks/useOptimization';
import './Dashboard.css';

export default function Dashboard() {
  const opt = useOptimization();
  const {
    nodes, edges, setNodes, setEdges,
    status, progress, progressLabel, iterations, runtime, error,
    baselineResult, engineResult, convergenceData,
    showComparison, activeView, setActiveView,
    jobHistory, clearHistory, restoreJob,
    runBaseline, runEngine, compareResults, loadData, reset,
  } = opt;

  // Right-panel tab: 'control' | 'history'
  const [rightTab, setRightTab] = useState('control');

  /* ── Graph view ── */
  const graphMode   = (engineResult && activeView === 'after') ? 'after' : 'before';
  const graphResult = graphMode === 'after' ? engineResult : baselineResult;

  /* ── Edge management ── */
  const handleAddEdge = useCallback((edge) => {
    setEdges(prev => [...prev, edge]);
    setNodes(prev => {
      const s = new Set(prev);
      s.add(edge.source);
      s.add(edge.target);
      return [...s];
    });
  }, [setEdges, setNodes]);

  const handleRemoveEdge = useCallback((idx) => {
    setEdges(prev => {
      const next = prev.filter((_, i) => i !== idx);
      const ns = new Set();
      next.forEach(e => { ns.add(e.source); ns.add(e.target); });
      setNodes([...ns]);
      return next;
    });
  }, [setEdges, setNodes]);

  const handleSetView = useCallback((v) => setActiveView(v), [setActiveView]);

  const isRunning = status === 'running_baseline' || status === 'running_engine';

  return (
    <div className="dashboard">

      {/* ════════════════════════════════════
          TOP METRICS STRIP
      ════════════════════════════════════ */}
      <div className="metrics-strip">
        <MetricsCard baseline={baselineResult} engine={engineResult} />
      </div>

      {/* ════════════════════════════════════
          MAIN 3-COLUMN WORKSPACE
      ════════════════════════════════════ */}
      <div className="workspace">

        {/* ── LEFT: Input ── */}
        <aside className="panel panel-left glass">
          <LeftPanel
            nodes={nodes}
            edges={edges}
            onLoad={loadData}
            onAddEdge={handleAddEdge}
            onRemoveEdge={handleRemoveEdge}
          />
        </aside>

        {/* ── CENTER: Graph ── */}
        <main className="panel panel-center">
          <div className="graph-header glass">
            <div className="graph-title">
              <div className="icon-wrap">🗺</div>
              <div>
                <h2>Network Visualization</h2>
                <p style={{ fontSize: '0.72rem', marginTop: 1 }}>
                  {nodes.length} hubs · {edges.length} routes
                </p>
              </div>
            </div>

            <div className="view-toggle">
              <button
                id="toggle-before"
                className={`toggle-btn ${graphMode === 'before' ? 'active' : ''}`}
                onClick={() => handleSetView('before')}
              >
                Before
              </button>
              <button
                id="toggle-after"
                className={`toggle-btn ${graphMode === 'after' ? 'active' : ''}`}
                onClick={() => engineResult && handleSetView('after')}
                disabled={!engineResult}
              >
                After
              </button>
              {engineResult && (
                <span className="badge badge-success" style={{ marginLeft: 8 }}>
                  +{engineResult.improvement_percent?.toFixed(1)}% optimized
                </span>
              )}
            </div>
          </div>

          <div className="graph-wrap glass">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              result={graphResult}
              mode={graphMode}
              animated={true}
            />
          </div>
        </main>

        {/* ── RIGHT: Control / History ── */}
        <aside className="panel panel-right glass">
          {/* Tab header */}
          <div className="right-tabs">
            <button
              className={`right-tab-btn ${rightTab === 'control' ? 'active' : ''}`}
              onClick={() => setRightTab('control')}
            >
              ⚙ Control
            </button>
            <button
              className={`right-tab-btn ${rightTab === 'history' ? 'active' : ''}`}
              onClick={() => setRightTab('history')}
            >
              🕐 History
              {jobHistory.length > 0 && (
                <span className="right-tab-count">{jobHistory.length}</span>
              )}
            </button>
          </div>

          {rightTab === 'control' ? (
            <ControlPanel
              status={status}
              progress={progress}
              progressLabel={progressLabel}
              iterations={iterations}
              runtime={runtime}
              error={error}
              baselineResult={baselineResult}
              engineResult={engineResult}
              showComparison={showComparison}
              onRunBaseline={runBaseline}
              onRunEngine={runEngine}
              onCompare={compareResults}
              onReset={reset}
            />
          ) : (
            <HistoryPanel
              jobs={jobHistory}
              onRestore={restoreJob}
              onClear={clearHistory}
            />
          )}
        </aside>
      </div>

      {/* ════════════════════════════════════
          BOTTOM ROW: Results + Convergence
      ════════════════════════════════════ */}
      <div className="bottom-row">

        {/* Results section */}
        <section className="results-section glass">
          <div className="results-section-header">
            <div className="icon-wrap">📋</div>
            <h2>Results Engine</h2>
            {(baselineResult || engineResult) && (
              <span className="badge badge-cyan" style={{ marginLeft: 8 }}>
                {engineResult ? 'Optimization complete' : 'Baseline computed'}
              </span>
            )}
          </div>
          <ResultsPanel
            baseline={baselineResult}
            engine={engineResult}
            showComparison={showComparison}
            activeView={activeView}
            onSetView={handleSetView}
          />
        </section>

        {/* Convergence chart */}
        <section className="convergence-section">
          <ConvergenceChart
            data={convergenceData}
            label="SPSA Cost Convergence"
            isRunning={isRunning && status === 'running_engine'}
          />
        </section>

      </div>
    </div>
  );
}
