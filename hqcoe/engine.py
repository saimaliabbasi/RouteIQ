import numpy as np
from qiskit_aer import AerSimulator
from scipy.optimize import minimize
from .circuit import VariationalQuantumCircuit
from .encoding import ProblemEncoder

class HybridOptimizationEngine:
    def __init__(self, encoder: ProblemEncoder, layers: int = 1, shots: int = 1024):
        """
        Hybrid Quantum-Classical Optimization Engine
        Connects the quantum circuit, problem encoder, measurement, and classical optimizer.
        """
        self.encoder = encoder
        self.num_qubits = len(encoder.graph.nodes)
        self.shots = shots
        self.ansatz = VariationalQuantumCircuit(num_qubits=self.num_qubits, layers=layers)
        self.simulator = AerSimulator()
        
        # Keep track of optimization history
        self.history = []

    def run_circuit(self, theta: np.ndarray) -> dict:
        """
        Measurement & Sampling Layer
        Runs the parameterized circuit and returns measurement counts.
        """
        qc = self.ansatz.build(theta)
        # Transpile for simulator if needed, AerSimulator can run it directly mostly
        result = self.simulator.run(qc, shots=self.shots).result()
        return result.get_counts()

    def cost_evaluation(self, theta: np.ndarray) -> float:
        """
        Cost Evaluation Engine (Classical)
        Evaluates how good each sampled solution is.
        L(θ) = E_{x ~ |ψ(θ)|^2} [C(x)]
        """
        counts = self.run_circuit(theta)
        total_cost = 0.0
        
        for bitstring, count in counts.items():
            # Qiskit measures in little-endian (least significant bit first)
            # Reverse the bitstring so that index 0 corresponds to qubit 0
            # Wait, usually for consistency we can just map it properly.
            # Qiskit's counts dict has bitstrings formatted as 'qn...q1q0'
            bitstring_rev = bitstring[::-1]
            total_cost += self.encoder.compute_maxcut_cost(bitstring_rev) * count
            
        expected_cost = total_cost / self.shots
        
        self.history.append(expected_cost)
        print(f"Iteration: {len(self.history)}, Cost: {expected_cost:.4f}")
        
        return expected_cost

    def optimize_cobyla(self, maxiter: int = 100) -> np.ndarray:
        """
        Classical Optimization Controller using COBYLA
        """
        print("Starting Classical Optimization (COBYLA)...")
        initial_theta = np.random.rand(self.ansatz.num_parameters) * 2 * np.pi
        self.history = []
        
        result = minimize(
            self.cost_evaluation,
            initial_theta,
            method='COBYLA',
            options={'maxiter': maxiter, 'rhobeg': 1.0, 'tol': 1e-4}
        )
        
        print(f"Optimization finished: {result.message}")
        return result.x

    def optimize_spsa(self, iterations: int = 100, a: float = 0.1, c: float = 0.1) -> np.ndarray:
        """
        Classical Optimization Controller using SPSA
        (Simultaneous Perturbation Stochastic Approximation)
        Very efficient for noisy quantum hardware.
        """
        print("Starting Classical Optimization (SPSA)...")
        theta = np.random.rand(self.ansatz.num_parameters) * 2 * np.pi
        self.history = []
        
        for t in range(iterations):
            # SPSA requires 2 evaluations per step
            delta = np.random.choice([-1, 1], size=len(theta))
            c_t = c / (t + 1)**0.101
            a_t = a / (t + 1)**0.602
            
            theta_plus = theta + c_t * delta
            theta_minus = theta - c_t * delta
            
            # Since SPSA expects 2 evaluations, we will bypass the internal history print
            # to keep console clean, but we still use the cost function
            # To preserve correct counting, let's just use it directly
            cost_plus = self.cost_evaluation(theta_plus)
            cost_minus = self.cost_evaluation(theta_minus)
            
            gradient_estimate = (cost_plus - cost_minus) / (2 * c_t * delta)
            theta = theta - a_t * gradient_estimate
            
        print("Optimization finished.")
        return theta
