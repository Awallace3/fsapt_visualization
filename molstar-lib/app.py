#!/usr/bin/env python3
"""
Flask server for fsapt visualization API
Provides endpoints for retrieving pairwise energy contributions from fsapt analysis
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import logging
from typing import Dict, List, Tuple, Optional
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class FsaptAnalyzer:
    """
    Mock fsapt analyzer class - replace with actual fsapt analysis logic
    """
    
    def __init__(self):
        # Sample data - replace with actual fsapt analysis
        self.sample_data = {
            "LIG_PROT_001": {
                "atom_indices": [15, 23, 45, 67, 89, 102, 134, 156, 178, 201],
                "energy_contributions": [-2.5, -1.8, -3.2, 1.5, -0.8, -2.1, 0.9, -1.4, -2.8, 1.2],
                "interaction_type": "electrostatic_dispersion",
                "total_interaction_energy": -8.8,
                "ligand_atoms": [15, 23, 45],
                "protein_atoms": [67, 89, 102, 134, 156, 178, 201]
            },
            "LIG_PROT_002": {
                "atom_indices": [12, 34, 56, 78, 90, 123, 145, 167, 189, 212],
                "energy_contributions": [-1.9, -2.4, -1.1, 2.1, -1.6, -3.0, 1.8, -0.7, -2.3, 0.8],
                "interaction_type": "hydrogen_bonding",
                "total_interaction_energy": -7.3,
                "ligand_atoms": [12, 34, 56],
                "protein_atoms": [78, 90, 123, 145, 167, 189, 212]
            }
        }
    
    def analyze_interactions(self, ligand_id: str, protein_id: str, threshold: float = 0.5) -> Dict:
        """
        Perform fsapt analysis for given ligand-protein pair
        
        Args:
            ligand_id: Identifier for the ligand
            protein_id: Identifier for the protein
            threshold: Energy threshold for significant interactions
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Create composite key
            composite_key = f"{ligand_id}_{protein_id}"
            
            # Check if we have sample data
            if composite_key in self.sample_data:
                data = self.sample_data[composite_key].copy()
            else:
                # Generate mock data for unknown pairs
                data = self._generate_mock_data(ligand_id, protein_id)
            
            # Apply threshold filtering
            if threshold > 0:
                filtered_indices = []
                filtered_energies = []
                
                for i, energy in enumerate(data["energy_contributions"]):
                    if abs(energy) >= threshold:
                        filtered_indices.append(data["atom_indices"][i])
                        filtered_energies.append(energy)
                
                data["atom_indices"] = filtered_indices
                data["energy_contributions"] = filtered_energies
            
            logger.info(f"Analysis completed for {ligand_id}-{protein_id}: {len(data['atom_indices'])} significant interactions")
            return data
            
        except Exception as e:
            logger.error(f"Error in fsapt analysis: {str(e)}")
            raise
    
    def _generate_mock_data(self, ligand_id: str, protein_id: str) -> Dict:
        """Generate mock fsapt data for testing purposes"""
        np.random.seed(hash(f"{ligand_id}_{protein_id}") % 2**32)
        
        n_interactions = np.random.randint(8, 15)
        atom_indices = np.random.randint(1, 300, size=n_interactions).tolist()
        
        # Generate realistic energy contributions (mostly attractive)
        energy_contributions = []
        for _ in range(n_interactions):
            if np.random.random() < 0.7:  # 70% attractive interactions
                energy_contributions.append(np.random.uniform(-4.0, -0.5))
            else:  # 30% repulsive interactions
                energy_contributions.append(np.random.uniform(0.5, 2.5))
        
        return {
            "atom_indices": atom_indices,
            "energy_contributions": energy_contributions,
            "interaction_type": "mixed",
            "total_interaction_energy": sum(energy_contributions),
            "ligand_atoms": atom_indices[:n_interactions//3],
            "protein_atoms": atom_indices[n_interactions//3:]
        }

# Initialize analyzer
fsapt_analyzer = FsaptAnalyzer()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "fsapt-visualization-api",
        "version": "1.0.0"
    })

@app.route('/api/fsapt-analysis', methods=['POST'])
def fsapt_analysis():
    """
    Perform fsapt analysis and return atom indices with energy contributions
    
    Expected JSON payload:
    {
        "ligand_id": "string",
        "protein_id": "string",
        "threshold": float (optional, default=0.5)
    }
    
    Returns:
    {
        "success": bool,
        "data": {
            "atom_indices": [int],
            "energy_contributions": [float],
            "interaction_type": "string",
            "total_interaction_energy": float
        },
        "message": "string"
    }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                "success": False,
                "data": {},
                "message": "Request must be JSON"
            }), 400
        
        data = request.get_json()
        
        # Validate required parameters
        required_params = ["ligand_id", "protein_id"]
        for param in required_params:
            if param not in data:
                return jsonify({
                    "success": False,
                    "data": {},
                    "message": f"Missing required parameter: {param}"
                }), 400
        
        ligand_id = data["ligand_id"]
        protein_id = data["protein_id"]
        threshold = data.get("threshold", 0.5)
        
        logger.info(f"Processing fsapt analysis request: {ligand_id} - {protein_id}")
        
        # Perform analysis
        analysis_result = fsapt_analyzer.analyze_interactions(
            ligand_id=ligand_id,
            protein_id=protein_id,
            threshold=threshold
        )
        
        return jsonify({
            "success": True,
            "data": analysis_result,
            "message": "Analysis completed successfully"
        })
        
    except Exception as e:
        logger.error(f"Error in fsapt analysis endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "data": {},
            "message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/api/available-pairs', methods=['GET'])
def get_available_pairs():
    """Get list of available ligand-protein pairs for analysis"""
    try:
        pairs = list(fsapt_analyzer.sample_data.keys())
        return jsonify({
            "success": True,
            "pairs": pairs,
            "message": "Successfully retrieved available pairs"
        })
    except Exception as e:
        logger.error(f"Error retrieving available pairs: {str(e)}")
        return jsonify({
            "success": False,
            "pairs": [],
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/api/interaction-summary/<ligand_id>/<protein_id>', methods=['GET'])
def get_interaction_summary(ligand_id: str, protein_id: str):
    """Get summary statistics for a ligand-protein interaction"""
    try:
        analysis_result = fsapt_analyzer.analyze_interactions(ligand_id, protein_id, threshold=0.0)
        
        energies = analysis_result["energy_contributions"]
        
        summary = {
            "total_interactions": len(energies),
            "total_energy": sum(energies),
            "attractive_interactions": len([e for e in energies if e < 0]),
            "repulsive_interactions": len([e for e in energies if e > 0]),
            "strongest_attractive": min(energies) if energies else 0,
            "strongest_repulsive": max(energies) if energies else 0,
            "average_energy": np.mean(energies) if energies else 0,
            "interaction_type": analysis_result.get("interaction_type", "unknown")
        }
        
        return jsonify({
            "success": True,
            "summary": summary,
            "message": "Summary generated successfully"
        })
        
    except Exception as e:
        logger.error(f"Error generating interaction summary: {str(e)}")
        return jsonify({
            "success": False,
            "summary": {},
            "message": f"Error: {str(e)}"
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "message": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "message": "Internal server error"
    }), 500

if __name__ == '__main__':
    logger.info("Starting fsapt visualization API server...")
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )
