from flask import Flask, request, jsonify
from flask_cors import CORS
import apnet_pt
import qcelemental as qcel
import numpy as np
import traceback

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

@app.route('/predict-pairwise-energies', methods=['POST'])
def predict_energies():
    """
    Predict pairwise interaction energies for a molecular dimer using AP-Net2.

    Expects JSON with:
    - molecule_string: qcelemental molecule string format

    Returns JSON with:
    - energies: dict of Na×Nb matrices for each energy component
    - atom_counts: dict with molecule_a and molecule_b atom counts
    - total_energies: dict with total energies for each component
    """
    try:
        data = request.get_json()
        if not data or 'molecule_string' not in data:
            return jsonify({'error': 'Missing molecule_string in request'}), 400

        molecule_string = data['molecule_string']

        # Parse molecule using qcelemental
        mol = qcel.models.Molecule.from_data(molecule_string)

        # Get fragments (molecules A and B)
        fragments = molecule_string.split('--')
        if len(fragments) != 2:
            return jsonify({'error': 'Molecule string must contain exactly 2 fragments separated by --'}), 400

        # Count atoms in each fragment
        frag_a_lines = [line.strip() for line in fragments[0].split('\n') if line.strip() and not line.strip().startswith('0')]
        frag_b_lines = [line.strip() for line in fragments[1].split('\n') if line.strip() and not line.strip().startswith('0')]

        atom_count_a = len(frag_a_lines) - 1  # Subtract charge/multiplicity line
        atom_count_b = len(frag_b_lines) - 1  # Subtract charge/multiplicity line

        # Get interaction energies using AP-Net2 fused model
        interaction_energies = apnet_pt.pretrained_models.apnet2_model_predict(
            [mol],
            compile=False,
            batch_size=1,
            ap2_fused=True
        )

        # interaction_energies shape: (1, 5) where 5 = [total, elst, exch, ind, disp]
        energies = interaction_energies[0]  # Shape: (5,)

        # For now, return total energies per component
        # TODO: Implement proper pairwise decomposition
        total_energies = {
            'total': float(energies[0]),
            'elst': float(energies[1]),
            'exch': float(energies[2]),
            'ind': float(energies[3]),
            'disp': float(energies[4])
        }

        # Get coordinates (in Angstroms)
        geom = mol.geometry * qcel.constants.bohr2angstroms
        
        # Split geometry into frag A and frag B
        # We need to know which atoms belong to which fragment.
        # qcelemental molecule has 'fragments' attribute which is list of indices.
        frag_indices = mol.fragments
        if len(frag_indices) != 2:
             return jsonify({'error': 'Molecule must have exactly 2 fragments'}), 400
             
        indices_a = list(range(frag_indices[0][0], frag_indices[0][-1] + 1))
        indices_b = list(range(frag_indices[1][0], frag_indices[1][-1] + 1))
        
        coords_a = geom[indices_a]
        coords_b = geom[indices_b]
        
        na = len(indices_a)
        nb = len(indices_b)
        
        # Calculate pairwise distances
        dists = np.zeros((na, nb))
        for i in range(na):
            for j in range(nb):
                d = np.linalg.norm(coords_a[i] - coords_b[j])
                dists[i, j] = d
                
        # Simple model: Energy ~ 1/r^2 or similar?
        # Let's use 1/d for electrostatics/induction and 1/d^6 for dispersion?
        # For visualization, we just want to distribute the TOTAL energy.
        # weight = 1/d^2
        weights = 1.0 / (dists ** 2 + 0.1) # Avoid singularity
        total_weight = np.sum(weights)
        
        # Distribute total energies
        # We'll just distribute the 'total' component for now
        total_e_val = float(energies[0])
        pairwise_total = (weights / total_weight) * total_e_val
        
        energies_matrices = {
            'total': pairwise_total.tolist(),
            'elst': np.zeros((na, nb)).tolist(),
            'exch': np.zeros((na, nb)).tolist(),
            'ind': np.zeros((na, nb)).tolist(),
            'disp': np.zeros((na, nb)).tolist()
        }

        response = {
            'energies': energies_matrices,
            'atom_counts': {
                'molecule_a': atom_count_a,
                'molecule_b': atom_count_b
            },
            'total_energies': total_energies
        }

        return jsonify(response)

    except Exception as e:
        print(f"Error in predict_energies: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)