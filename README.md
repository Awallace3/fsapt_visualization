# fsapt_visualization

Prototype Flask + 3Dmol.js application for visualizing FSAPT fragment-pair
energies and ML/Psi4 error analysis.

## What this prototype includes

- Flask backend for:
  - Parsing qcelemental molecule strings split by `--`
  - Running qcmlforge APNet ML inference (`apnet_pt`) when available
  - Running Psi4 F-SAPT baseline when available
  - Returning canonical fragment-pair rows and merged error rows
- 3Dmol.js frontend for:
  - Molecule rendering
  - Fragment pair highlighting on row click
  - Error table (`ML Total`, `Psi4 Total`, `Error Total`, `|Error| Total`)
- Built-in default example from
  `test_ap3_fused_fsapt_energies_mocking_test`.

## Run locally

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Start the Flask app:

```bash
python app.py
```

3. Open:

```text
http://localhost:5000
```

## API endpoints

- `GET /api/health`
- `GET /api/example/ap3-fused`
- `POST /api/parse-molecule`
- `POST /api/predict/ml-fsapt`
- `POST /api/predict/psi4-fsapt`
- `POST /api/upload/psi4-fsapt-zip`
- `POST /api/compare`

## Notes

- ML prediction requires `qcelemental` and `apnet_pt` installed in your Python
  environment.
- Psi4 prediction requires `psi4` installed.
- Fragment indices are expected to be 1-indexed (aligned with Psi4
  `fsapt_analysis` usage).
- Uploaded FSAPT zip processing requires these files at archive root (or single
  nested directory): `geom.xyz`, `fA.dat`, `fB.dat`, `QA.dat`, `QB.dat`,
  `ZA.dat`, `ZB.dat`, `Elst.dat`, `Exch.dat`, `IndAB.dat`, `IndBA.dat`.
