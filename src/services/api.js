import axios from 'axios';

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
});

const cache = new Map();

function getCacheKey(nodes, edges) {
  const sorted = [...edges].sort((a, b) =>
    `${a.source}${a.target}`.localeCompare(`${b.source}${b.target}`)
  );

  return JSON.stringify({ nodes: [...nodes].sort(), edges: sorted });
}

function toClientError(err) {
  if (err.response) {
    return new Error(err.response.data?.detail || `Server error ${err.response.status}`, { cause: err });
  }

  if (err.code === 'ECONNABORTED') {
    return new Error('Optimization timed out. Try fewer nodes or iterations.', { cause: err });
  }

  return new Error('Cannot reach optimization server. Is the API running?', { cause: err });
}

export async function checkHealth() {
  const res = await client.get('/health');
  return res.data;
}

export async function runOptimization(nodes, edges, { useCache = true } = {}) {
  const key = getCacheKey(nodes, edges);
  if (useCache && cache.has(key)) {
    return { ...cache.get(key), cached: true };
  }

  const payload = {
    nodes,
    edges: edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: parseFloat(edge.weight),
    })),
  };

  try {
    const res = await client.post('/optimize', payload);
    const result = { ...res.data, cached: false };
    cache.set(key, res.data);
    return result;
  } catch (err) {
    throw toClientError(err);
  }
}

export function clearCache() {
  cache.clear();
}

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const header = lines[0]
    .replace(/^\uFEFF/, '')
    .split(',')
    .map((heading) => heading.trim().toLowerCase());

  const sourceIdx = header.indexOf('source');
  const targetIdx = header.indexOf('target');
  const weightIdx = header.indexOf('weight');

  if (sourceIdx === -1 || targetIdx === -1) {
    throw new Error('CSV must have "source" and "target" columns.');
  }

  const edges = [];
  const nodeSet = new Set();

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((part) => part.trim());
    const source = parts[sourceIdx];
    const target = parts[targetIdx];
    const weight = weightIdx !== -1 ? parseFloat(parts[weightIdx]) : 1.0;

    if (!source || !target) {
      continue;
    }

    if (Number.isNaN(weight)) {
      throw new Error(`Invalid weight on row ${i + 1}`);
    }

    edges.push({ source, target, weight });
    nodeSet.add(source);
    nodeSet.add(target);
  }

  if (edges.length === 0) {
    throw new Error('CSV has no valid edges.');
  }

  if (nodeSet.size > 12) {
    throw new Error('Max 12 nodes supported. Please reduce the network size.');
  }

  return { nodes: [...nodeSet], edges };
}
