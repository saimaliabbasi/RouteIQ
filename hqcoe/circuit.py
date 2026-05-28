from qiskit import QuantumCircuit
import numpy as np

class VariationalQuantumCircuit:
    def __init__(self, num_qubits: int, layers: int = 1):
        """
        Variational Quantum Circuit (The Core Engine)
        Creates a tunable quantum system controlled by parameters θ.
        """
        self.num_qubits = num_qubits
        self.layers = layers
        # Number of parameters: each layer has `num_qubits` rotations (Ry) 
        # Alternatively, Ry and Rz rotations could be used for more expressivity
        self.num_parameters = self.num_qubits * self.layers * 2

    def build(self, theta: np.ndarray) -> QuantumCircuit:
        """
        Builds the parameterized quantum circuit using given parameters `theta`.
        """
        qc = QuantumCircuit(self.num_qubits)
        
        # 1. Quantum State Preparation Layer
        # Apply Hadamard gates to create full superposition of all possible solutions
        for i in range(self.num_qubits):
            qc.h(i)
            
        # 2. Variational Layers
        k = 0
        for layer in range(self.layers):
            # Rotation Gates Layer
            for i in range(self.num_qubits):
                qc.ry(theta[k], i)
                k += 1
                qc.rz(theta[k], i)
                k += 1
                
            # Entanglement Layer (Linear / CNOT chain)
            if self.num_qubits > 1:
                for i in range(self.num_qubits - 1):
                    qc.cx(i, i + 1)
                # Add ring entanglement for boundary
                if self.num_qubits > 2:
                    qc.cx(self.num_qubits - 1, 0)
                    
        # 3. Measurement
        qc.measure_all()
        
        return qc
