from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import networkx as nx
import numpy as np
import time
import uuid
from datetime import datetime

# Import our engine
from hqcoe.encoding import ProblemEncoder
from hqcoe.engine import HybridOptimizationEngine

app = FastAPI(
    title="RouteIQ — Advanced Optimization Engine",
    description="Hybrid Quantum-Classical Logistics Optimization as a Service",
    version="2.0.0",
)

# Allow Vite dev server and any local frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------- In-memory job history store -----------
job_history: List[Dict] = []

# ----------- Request / Response Models -----------
class RouteEdge(BaseModel):
    source: str
    target: str
    weight: float

class OptimizationRequest(BaseModel):
    nodes: List[str]
    edges: List[RouteEdge]
    iterations: Optional[int] = 30
    layers: Optional[int] = 1
    shots: Optional[int] = 1024

class OptimizationResponse(BaseModel):
    job_id: str
    status: str
    zones: Dict[str, str]
    cost_saved: float
    total_cost_evaluated: float
    improvement_percent: float
    convergence: List[float]
    runtime_seconds: float
    timestamp: str
    nodes_count: int
    edges_count: int

class BenchmarkResponse(BaseModel):
    job_id: str
    baseline: Dict[str, Any]
    engine: Dict[str, Any]
    delta_improvement: float
    winner: str

# ----------- Helpers -----------
def build_graph(req: OptimizationRequest) -> nx.Graph:
    G = nx.Graph()
    G.add_nodes_from(req.nodes)
    for edge in req.edges:
        G.add_edge(edge.source, edge.target, weight=edge.weight)
    return G

def compute_greedy_baseline(G: nx.Graph) -> Dict:
    """Classical greedy zone partition by node index parity."""
    nodes_list = list(G.nodes)
    total_cost = sum(d['weight'] for _, _, d in G.edges(data=True))
    zones = {n: ('Zone A' if i % 2 == 0 else 'Zone B') for i, n in enumerate(nodes_list)}
    cut = sum(d['weight'] for u, v, d in G.edges(data=True) if zones[u] != zones[v])
    return {
        "zones": zones,
        "cost_saved": round(cut, 4),
        "total_cost_evaluated": round(total_cost, 4),
        "improvement_percent": round((cut / total_cost) * 100, 2) if total_cost > 0 else 0,
    }

# ----------- Endpoints -----------

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_routes(req: OptimizationRequest):
    try:
        t0 = time.time()
        job_id = str(uuid.uuid4())[:8]

        G = build_graph(req)
        total_possible_cost = sum(d['weight'] for _, _, d in G.edges(data=True))

        encoder = ProblemEncoder(G)
        engine  = HybridOptimizationEngine(encoder, layers=req.layers, shots=req.shots)

        best_theta = engine.optimize_spsa(iterations=req.iterations, a=0.2, c=0.2)

        counts = engine.run_circuit(best_theta)
        best_bitstring_qiskit = max(counts, key=counts.get)
        best_bitstring = best_bitstring_qiskit[::-1]

        zones = {}
        for idx, node in enumerate(list(G.nodes)):
            zones[node] = "Zone A" if best_bitstring[idx] == '0' else "Zone B"

        cut_value = -encoder.compute_maxcut_cost(best_bitstring)
        improvement_percent = (cut_value / total_possible_cost) * 100 if total_possible_cost > 0 else 0

        runtime = round(time.time() - t0, 2)
        ts = datetime.utcnow().isoformat() + "Z"

        # Downsample convergence to max 60 points for clean chart rendering
        raw_history = engine.history
        if len(raw_history) > 60:
            step = len(raw_history) / 60
            convergence = [round(raw_history[int(i * step)], 4) for i in range(60)]
        else:
            convergence = [round(v, 4) for v in raw_history]

        result = {
            "job_id": job_id,
            "status": "success",
            "zones": zones,
            "cost_saved": round(cut_value, 4),
            "total_cost_evaluated": round(total_possible_cost, 4),
            "improvement_percent": round(improvement_percent, 2),
            "convergence": convergence,
            "runtime_seconds": runtime,
            "timestamp": ts,
            "nodes_count": len(req.nodes),
            "edges_count": len(req.edges),
        }

        # Store in history
        job_history.append({**result, "nodes": req.nodes, "edges": [e.dict() for e in req.edges]})
        if len(job_history) > 50:
            job_history.pop(0)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/benchmark", response_model=BenchmarkResponse)
async def benchmark(req: OptimizationRequest):
    """Run both classical baseline and optimization engine and compare."""
    try:
        job_id = str(uuid.uuid4())[:8]
        G = build_graph(req)

        # Classical baseline
        baseline = compute_greedy_baseline(G)

        # Engine result (call optimize endpoint logic directly)
        total_possible_cost = sum(d['weight'] for _, _, d in G.edges(data=True))
        encoder = ProblemEncoder(G)
        engine  = HybridOptimizationEngine(encoder, layers=req.layers, shots=req.shots)
        best_theta = engine.optimize_spsa(iterations=req.iterations, a=0.2, c=0.2)
        counts = engine.run_circuit(best_theta)
        best_bitstring = max(counts, key=counts.get)[::-1]

        zones = {node: ("Zone A" if best_bitstring[i] == '0' else "Zone B")
                 for i, node in enumerate(list(G.nodes))}
        cut_value = -encoder.compute_maxcut_cost(best_bitstring)
        engine_pct = (cut_value / total_possible_cost) * 100 if total_possible_cost > 0 else 0

        engine_result = {
            "zones": zones,
            "cost_saved": round(cut_value, 4),
            "total_cost_evaluated": round(total_possible_cost, 4),
            "improvement_percent": round(engine_pct, 2),
        }

        delta = round(engine_result["improvement_percent"] - baseline["improvement_percent"], 2)
        winner = "engine" if delta > 0 else "baseline"

        return {
            "job_id": job_id,
            "baseline": baseline,
            "engine": engine_result,
            "delta_improvement": delta,
            "winner": winner,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
def get_history():
    """Return the last 50 optimization job records."""
    return {"jobs": list(reversed(job_history))}


@app.delete("/history")
def clear_history():
    job_history.clear()
    return {"status": "cleared"}


@app.get("/health")
def health_check():
    return {
        "status": "Optimization Engine Online",
        "version": "2.0.0",
        "jobs_completed": len(job_history),
    }
