from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

from backend.example_data import (
    EXAMPLE_FRAGMENTS_A,
    EXAMPLE_FRAGMENTS_B,
    EXAMPLE_MOLECULE,
)
from backend.services.compare import compare_rows
from backend.services.fsapt_ml import run_ml_fsapt
from backend.services.fsapt_psi4 import run_psi4_fsapt
from backend.services.fsapt_upload import (
    process_uploaded_fsapt_zip,
    validate_uploaded_fsapt_zip,
)
from backend.services.parsing import (
    normalize_fragments_input,
    parse_molecule_string,
    validate_fragments_against_monomers,
)


def _parse_common_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    molecule = payload.get("molecule", "")
    if not molecule:
        raise ValueError("Request must include a non-empty 'molecule' string")

    fragments_a = normalize_fragments_input(payload.get("fragments_a", {}))
    fragments_b = normalize_fragments_input(payload.get("fragments_b", {}))
    parsed = parse_molecule_string(molecule)
    fragments_a, fragments_b = validate_fragments_against_monomers(
        fragments_a,
        fragments_b,
        parsed["monomer_a_indices"],
        parsed["monomer_b_indices"],
    )

    return {
        "molecule": molecule,
        "fragments_a": fragments_a,
        "fragments_b": fragments_b,
        "parsed": parsed,
    }


def create_app() -> Flask:
    root_dir = Path(__file__).resolve().parents[1]
    frontend_dir = root_dir / "frontend"

    app = Flask(__name__, static_folder=str(frontend_dir), static_url_path="")

    @app.get("/api/health")
    def health() -> Any:
        return jsonify({"status": "ok"})

    @app.get("/api/example/ap3-fused")
    def example_ap3_fused() -> Any:
        parsed = parse_molecule_string(EXAMPLE_MOLECULE)
        return jsonify(
            {
                "molecule": EXAMPLE_MOLECULE,
                "fragments_a": EXAMPLE_FRAGMENTS_A,
                "fragments_b": EXAMPLE_FRAGMENTS_B,
                "parsed": parsed,
            }
        )

    @app.post("/api/parse-molecule")
    def parse_molecule() -> Any:
        payload = request.get_json(silent=True) or {}
        molecule = payload.get("molecule", "")
        parsed = parse_molecule_string(molecule)
        return jsonify(parsed)

    @app.post("/api/predict/ml-fsapt")
    def predict_ml_fsapt() -> Any:
        payload = request.get_json(silent=True) or {}
        common = _parse_common_payload(payload)
        rows = run_ml_fsapt(
            common["molecule"],
            common["fragments_a"],
            common["fragments_b"],
        )
        return jsonify({"rows": rows, "parsed": common["parsed"]})

    @app.post("/api/predict/psi4-fsapt")
    def predict_psi4_fsapt() -> Any:
        payload = request.get_json(silent=True) or {}
        common = _parse_common_payload(payload)
        basis = payload.get("basis", "jun-cc-pvdz")
        rows = run_psi4_fsapt(
            common["molecule"],
            common["fragments_a"],
            common["fragments_b"],
            basis=basis,
        )
        return jsonify({"rows": rows, "parsed": common["parsed"], "basis": basis})

    @app.post("/api/upload/psi4-fsapt-zip")
    def upload_psi4_fsapt_zip() -> Any:
        if "file" not in request.files:
            raise ValueError(
                "No file uploaded. Provide a zip file under form field 'file'."
            )

        uploaded = request.files["file"]
        if uploaded.filename is None or not uploaded.filename.lower().endswith(".zip"):
            raise ValueError("Uploaded file must be a .zip archive")

        payload = uploaded.read()
        if not payload:
            raise ValueError("Uploaded zip file is empty")

        result = process_uploaded_fsapt_zip(payload)
        return jsonify(result)

    @app.post("/api/upload/psi4-fsapt-zip/validate")
    def validate_psi4_fsapt_zip() -> Any:
        if "file" not in request.files:
            raise ValueError(
                "No file uploaded. Provide a zip file under form field 'file'."
            )

        uploaded = request.files["file"]
        if uploaded.filename is None or not uploaded.filename.lower().endswith(".zip"):
            raise ValueError("Uploaded file must be a .zip archive")

        payload = uploaded.read()
        if not payload:
            raise ValueError("Uploaded zip file is empty")

        result = validate_uploaded_fsapt_zip(payload)
        if not result["ok"]:
            missing = result.get("missing_files", [])
            invalid = result.get("invalid_files", [])
            details: List[str] = []
            if missing:
                details.append(f"missing files: {missing}")
            if invalid:
                details.append(f"invalid files: {invalid}")
            return jsonify(
                {"error": "FSAPT zip validation failed", "details": details, **result}
            ), 400

        return jsonify(result)

    @app.post("/api/compare")
    def compare() -> Any:
        payload = request.get_json(silent=True) or {}

        ml_rows = payload.get("ml_rows")
        psi4_rows = payload.get("psi4_rows")

        if ml_rows is None or psi4_rows is None:
            common = _parse_common_payload(payload)
            ml_rows = run_ml_fsapt(
                common["molecule"],
                common["fragments_a"],
                common["fragments_b"],
            )

            run_psi4 = bool(payload.get("run_psi4", False))
            if run_psi4:
                basis = payload.get("basis", "jun-cc-pvdz")
                psi4_rows = run_psi4_fsapt(
                    common["molecule"],
                    common["fragments_a"],
                    common["fragments_b"],
                    basis=basis,
                )
            else:
                psi4_rows = []

        compared = compare_rows(ml_rows=ml_rows, psi4_rows=psi4_rows)
        return jsonify(
            {
                "comparison_rows": compared,
                "ml_rows": ml_rows,
                "psi4_rows": psi4_rows,
            }
        )

    @app.errorhandler(ValueError)
    def handle_value_error(err: ValueError) -> Any:
        return jsonify({"error": str(err)}), 400

    @app.errorhandler(RuntimeError)
    def handle_runtime_error(err: RuntimeError) -> Any:
        return jsonify({"error": str(err)}), 500

    @app.errorhandler(Exception)
    def handle_unexpected_error(err: Exception) -> Any:
        if isinstance(err, HTTPException):
            return err
        return jsonify({"error": f"Unexpected server error: {err}"}), 500

    @app.get("/")
    def serve_index() -> Any:
        return send_from_directory(frontend_dir, "index.html")

    return app
