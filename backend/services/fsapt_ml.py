from __future__ import annotations

from typing import Dict, List

import pandas as pd

from backend.services.normalize import standardize_rows


def run_ml_fsapt(
    molecule: str,
    fragments_a: Dict[str, List[int]],
    fragments_b: Dict[str, List[int]],
) -> List[Dict]:
    try:
        import apnet_pt
        import qcelemental as qcel
    except ImportError as exc:
        raise RuntimeError(
            "ML backend dependencies are missing. Install qcelemental and apnet_pt."
        ) from exc

    try:
        mol = qcel.models.Molecule.from_data(molecule)
    except Exception as exc:
        raise RuntimeError(
            "Could not parse molecule for ML prediction. Check the QCE molecule format, "
            "including charge/multiplicity lines for both monomers before and after '--'."
        ) from exc

    try:
        # _, _, df_out = apnet_pt.pretrained_models.apnet3_model_predict_pairs(
        _, _, df_out = apnet_pt.pretrained_models.apnet2_model_predict_pairs(
            [mol],
            fAs=[fragments_a],
            fBs=[fragments_b],
            compile=False,
            print_results=False,
        )
    except Exception as exc:
        raise RuntimeError(
            "ML prediction failed. A common cause is incorrect monomer charge/multiplicity "
            "in the QCE molecule string (especially after uploading Psi4 FSAPT data). "
            "Please verify both monomer headers like '0 1' and fragment assignments. "
            f"Original error: {exc}"
        ) from exc

    if isinstance(df_out, pd.DataFrame):
        df = df_out.copy()
    else:
        df = pd.DataFrame(df_out)

    return standardize_rows(
        df, source="ml", fragments_a=fragments_a, fragments_b=fragments_b
    )
