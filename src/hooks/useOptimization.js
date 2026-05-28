import { useCallback, useEffect, useRef, useState } from 'react';
import { runOptimization } from '../services/api';

const DEFAULT_NODES = ['Hub_A', 'Hub_B', 'Hub_C', 'Hub_D', 'Hub_E'];
const DEFAULT_EDGES = [
  { source: 'Hub_A', target: 'Hub_B', weight: 5.0 },
  { source: 'Hub_A', target: 'Hub_C', weight: 8.0 },
  { source: 'Hub_B', target: 'Hub_C', weight: 2.0 },
  { source: 'Hub_B', target: 'Hub_D', weight: 10.0 },
  { source: 'Hub_C', target: 'Hub_E', weight: 6.0 },
  { source: 'Hub_D', target: 'Hub_E', weight: 4.0 },
  { source: 'Hub_A', target: 'Hub_D', weight: 12.0 },
];

export function useOptimization() {
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [edges, setEdges] = useState(DEFAULT_EDGES);

  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [iterations, setIterations] = useState(0);
  const [runtime, setRuntime] = useState(null);
  const [error, setError] = useState(null);

  const [baselineResult, setBaselineResult] = useState(null);
  const [engineResult, setEngineResult] = useState(null);
  const [convergenceData, setConvergenceData] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [activeView, setActiveView] = useState('before');
  const [jobHistory, setJobHistory] = useState([]);

  const progressTimerRef = useRef(null);
  const progressResolveRef = useRef(null);

  useEffect(() => () => {
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;

    if (progressResolveRef.current) {
      progressResolveRef.current();
      progressResolveRef.current = null;
    }
  }, []);

  const resolveProgress = useCallback(() => {
    if (progressResolveRef.current) {
      const resolve = progressResolveRef.current;
      progressResolveRef.current = null;
      resolve();
    }
  }, []);

  const simulateProgress = useCallback((label, durationMs, steps = 30) => {
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    resolveProgress();

    setProgress(0);
    setProgressLabel(label);
    setIterations(0);

    let step = 0;
    const interval = durationMs / steps;

    return new Promise((resolve) => {
      progressResolveRef.current = resolve;
      progressTimerRef.current = setInterval(() => {
        step += 1;
        setProgress(Math.min(95, (step / steps) * 100));
        setIterations(step * 2);

        if (step >= steps) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
          resolveProgress();
        }
      }, interval);
    });
  }, [resolveProgress]);

  const stopProgress = useCallback((complete = true) => {
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    resolveProgress();
    setProgress(complete ? 100 : 0);
  }, [resolveProgress]);

  const computeBaseline = useCallback((nodeList, edgeList) => {
    const totalCost = edgeList.reduce((sum, edge) => sum + edge.weight, 0);
    const zonesBaseline = {};

    nodeList.forEach((node, index) => {
      zonesBaseline[node] = index % 2 === 0 ? 'Zone A' : 'Zone B';
    });

    const crossCost = edgeList.reduce((sum, edge) => (
      zonesBaseline[edge.source] !== zonesBaseline[edge.target] ? sum + edge.weight : sum
    ), 0);

    return {
      status: 'baseline',
      zones: zonesBaseline,
      cost_saved: crossCost,
      total_cost_evaluated: totalCost,
      improvement_percent: totalCost > 0 ? (crossCost / totalCost) * 100 : 0,
      method: 'Classical Baseline',
      convergence: null,
    };
  }, []);

  const runBaseline = useCallback(async () => {
    setError(null);
    setStatus('running_baseline');
    setShowComparison(false);
    setActiveView('before');
    setConvergenceData(null);
    setRuntime(null);

    const t0 = performance.now();
    await simulateProgress('Running classical baseline...', 1200, 20);

    const result = computeBaseline(nodes, edges);
    stopProgress();
    setRuntime(((performance.now() - t0) / 1000).toFixed(2));
    setBaselineResult(result);
    setStatus('done');
    setActiveView('before');
  }, [computeBaseline, edges, nodes, simulateProgress, stopProgress]);

  const runEngine = useCallback(async () => {
    setError(null);
    setStatus('running_engine');
    setActiveView('before');
    setConvergenceData(null);
    setRuntime(null);

    const t0 = performance.now();
    const progressPromise = simulateProgress('Optimization engine running...', 12000, 30);

    try {
      const result = await runOptimization(nodes, edges, { useCache: false });
      stopProgress();
      await progressPromise;

      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      setRuntime(result.runtime_seconds ?? elapsed);
      setIterations(result.convergence?.length ?? 60);

      const engineRes = {
        ...result,
        method: 'Optimization Engine',
        runtime_seconds: result.runtime_seconds ?? elapsed,
      };

      setEngineResult(engineRes);
      setConvergenceData(result.convergence ?? null);
      setStatus('done');
      setActiveView('after');

      if (baselineResult) {
        setShowComparison(true);
      }

      const historyEntry = {
        ...engineRes,
        nodes: [...nodes],
        edges: edges.map((edge) => ({ ...edge })),
      };

      setJobHistory((prev) => [historyEntry, ...prev].slice(0, 50));
      return engineRes;
    } catch (err) {
      stopProgress(false);
      setError(err.message);
      setStatus('error');
      return null;
    }
  }, [baselineResult, edges, nodes, simulateProgress, stopProgress]);

  const compareResults = useCallback(async () => {
    if (!baselineResult) {
      setError(null);
      setStatus('running_baseline');
      setConvergenceData(null);

      await simulateProgress('Running classical baseline...', 800, 16);
      const baseline = computeBaseline(nodes, edges);
      stopProgress();
      setBaselineResult(baseline);
    }

    const engine = await runEngine();
    if (engine) {
      setShowComparison(true);
    }
  }, [baselineResult, computeBaseline, edges, nodes, runEngine, simulateProgress, stopProgress]);

  const loadData = useCallback((newNodes, newEdges) => {
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    resolveProgress();

    setNodes(newNodes);
    setEdges(newEdges);
    setBaselineResult(null);
    setEngineResult(null);
    setConvergenceData(null);
    setStatus('idle');
    setProgress(0);
    setProgressLabel('');
    setIterations(0);
    setRuntime(null);
    setError(null);
    setShowComparison(false);
    setActiveView('before');
  }, [resolveProgress]);

  const reset = useCallback(() => {
    loadData(DEFAULT_NODES, DEFAULT_EDGES);
  }, [loadData]);

  const restoreJob = useCallback((job) => {
    if (job.nodes && job.edges) {
      loadData(job.nodes, job.edges);
    }
  }, [loadData]);

  const clearHistory = useCallback(() => {
    setJobHistory([]);
  }, []);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    status,
    progress,
    progressLabel,
    iterations,
    runtime,
    error,
    baselineResult,
    engineResult,
    convergenceData,
    showComparison,
    activeView,
    setActiveView,
    jobHistory,
    clearHistory,
    restoreJob,
    runBaseline,
    runEngine,
    compareResults,
    loadData,
    reset,
  };
}
