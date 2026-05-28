import networkx as nx

class ProblemEncoder:
    def __init__(self, graph: nx.Graph):
        """
        Problem Encoding Layer (Classical)
        Converts real-world optimization problems into quantum-compatible mathematical form.
        """
        self.graph = graph
        self.nodes_list = list(graph.nodes)
        self.node_to_idx = {node: idx for idx, node in enumerate(self.nodes_list)}

    def compute_maxcut_cost(self, bitstring: str) -> float:
        """
        Computes the cost of a given bitstring for the MaxCut problem.
        The quantum optimizer tries to MINIMIZE the cost, so we return the negative of the cut weight,
        or we formulate it such that lower energy = better cut.
        
        Formula: C(x) = sum w_ij * (1 - x_i * x_j)
        where x_i in {-1, 1}.
        
        For bitstrings in {0, 1}, x_i = 1 - 2*b_i
        """
        cost = 0.0
        for u, v, data in self.graph.edges(data=True):
            weight = data.get('weight', 1.0)
            
            i = self.node_to_idx[u]
            j = self.node_to_idx[v]
            
            # Convert bits from '0'/'1' to spin variables 1/-1
            b_i = int(bitstring[i])
            b_j = int(bitstring[j])
            
            x_i = 1 - 2 * b_i
            x_j = 1 - 2 * b_j
            
            # For MaxCut, cost = sum w_ij * (1 - x_i * x_j) / 2
            # We want to maximize the cut, meaning we want x_i != x_j
            # If x_i != x_j, x_i * x_j = -1, (1 - x_i * x_j) = 2, term = weight
            # If x_i == x_j, x_i * x_j = 1, (1 - x_i * x_j) = 0, term = 0
            # To cast as minimization, we subtract the cut value from 0.
            
            cut_value = weight * (1 - x_i * x_j) / 2
            cost -= cut_value  # Minimize negative cut value to maximize cut
            
        return cost
