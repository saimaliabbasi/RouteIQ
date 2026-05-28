import networkx as nx
import matplotlib.pyplot as plt
from hqcoe.encoding import ProblemEncoder
from hqcoe.engine import HybridOptimizationEngine
import numpy as np

def create_logistics_graph():
    """
    Creates a realistic use-case graph for logistics delivery network.
    Nodes = Cities/Locations
    Edges = Delivery routes (Weights = Traffic/Fuel Cost)
    """
    G = nx.Graph()
    # 5 Logistics Hubs/Cities
    locations = ["Hub_A", "Hub_B", "Hub_C", "Hub_D", "Hub_E"]
    G.add_nodes_from(locations)
    
    # Add weighted edges representing distance/cost between hubs
    G.add_edge("Hub_A", "Hub_B", weight=5.0)
    G.add_edge("Hub_A", "Hub_C", weight=8.0)
    G.add_edge("Hub_B", "Hub_C", weight=2.0)
    G.add_edge("Hub_B", "Hub_D", weight=10.0)
    G.add_edge("Hub_C", "Hub_E", weight=6.0)
    G.add_edge("Hub_D", "Hub_E", weight=4.0)
    G.add_edge("Hub_A", "Hub_D", weight=12.0)
    
    return G

def plot_results(G, best_bitstring, history):
    """
    Visualizes the training history and the final optimized graph cut.
    """
    # Plot Cost History
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(history, label="Cost L(θ)", color='blue', linewidth=2)
    plt.title("Quantum Optimization Learning Curve")
    plt.xlabel("Evaluation Step")
    plt.ylabel("Expectation Value (Cost)")
    plt.legend()
    plt.grid(True)
    
    # Plot Graph Cut
    plt.subplot(1, 2, 2)
    pos = nx.spring_layout(G, seed=42)
    
    colors = ['red' if best_bitstring[i] == '0' else 'green' for i in range(len(G.nodes))]
    
    nx.draw_networkx_nodes(G, pos, node_color=colors, node_size=700)
    nx.draw_networkx_labels(G, pos, font_color='white', font_weight='bold')
    
    # Draw edges, highlighting the cut edges
    edges = G.edges()
    weights = [G[u][v]['weight'] for u, v in edges]
    
    # Identify cut edges
    cut_edges = []
    uncut_edges = []
    for u, v in edges:
        u_idx = list(G.nodes).index(u)
        v_idx = list(G.nodes).index(v)
        if best_bitstring[u_idx] != best_bitstring[v_idx]:
            cut_edges.append((u, v))
        else:
            uncut_edges.append((u, v))
            
    nx.draw_networkx_edges(G, pos, edgelist=uncut_edges, width=2, alpha=0.5, style='dashed')
    nx.draw_networkx_edges(G, pos, edgelist=cut_edges, width=3, edge_color='orange')
    
    edge_labels = nx.get_edge_attributes(G, 'weight')
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)
    
    plt.title("Optimized Delivery Zones (MaxCut)")
    plt.tight_layout()
    plt.savefig("logistics_optimization_results.png")
    print("Saved plot to 'logistics_optimization_results.png'")

import itertools

def classical_brute_force(G, encoder):
    n = len(G.nodes)
    best_cost = float('inf')
    best_bitstring = None
    all_costs = []
    
    for seq in itertools.product("01", repeat=n):
        bitstring = "".join(seq)
        cost = encoder.compute_maxcut_cost(bitstring)
        all_costs.append(cost)
        if cost < best_cost:
            best_cost = cost
            best_bitstring = bitstring
            
    random_avg_cost = np.mean(all_costs)
    return best_bitstring, best_cost, random_avg_cost

def main():
    print("==================================================")
    print("SMART LOGISTICS OPTIMIZATION SYSTEM (HQCOE)")
    print("==================================================")
    
    # 1. Problem Input
    G = create_logistics_graph()
    print(f"[1] Loaded Logistics Network: {len(G.nodes)} hubs, {len(G.edges)} routes.")
    
    # 2. Encoding Layer
    encoder = ProblemEncoder(G)
    print("[2] Initialized Hamiltonian Encoding (MaxCut).")
    
    # Classical Baseline
    print("[*] Running Classical Brute-Force Baseline...")
    opt_bitstring, opt_cost, rand_cost = classical_brute_force(G, encoder)
    print(f"    -> True Ground State Cost: {opt_cost}")
    print(f"    -> Random Guess Average Cost: {rand_cost:.2f}")

    # 3. Hybrid Engine Setup
    engine = HybridOptimizationEngine(encoder, layers=1, shots=1024)
    print("[3] Built Variational Quantum Ansatz.")
    
    # 4. Optimization Loop
    print("[4] Starting SPSA Classical Optimization Loop...")
    best_theta = engine.optimize_spsa(iterations=30, a=0.2, c=0.2)
    
    print("\n==================================================")
    print("OPTIMIZATION COMPLETE")
    print("==================================================")
    
    # 5. Retrieve Best Result
    counts = engine.run_circuit(best_theta)
    best_bitstring_qiskit_format = max(counts, key=counts.get)
    best_bitstring = best_bitstring_qiskit_format[::-1]
    hqcoe_cost = encoder.compute_maxcut_cost(best_bitstring)
    
    print(f"Sampled Basis State: |{best_bitstring}> (measured {counts[best_bitstring_qiskit_format]}/1024 shots)")
    
    print("\n[Comparison]")
    print(f"Method          | Cost (Lower is better)")
    print(f"----------------|-----------------------")
    print(f"Random Average  | {rand_cost:.2f}")
    print(f"HQCOE (Quantum) | {hqcoe_cost:.2f}")
    print(f"True Ground     | {opt_cost:.2f}")
    
    print("\n[5] Generating Visualizations...")
    plot_results(G, best_bitstring, engine.history)

if __name__ == "__main__":
    main()
