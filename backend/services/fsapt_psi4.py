from __future__ import annotations

from typing import Dict, List

import pandas as pd

from backend.services.normalize import standardize_rows


def run_psi4_fsapt(
    molecule: str,
    fragments_a: Dict[str, List[int]],
    fragments_b: Dict[str, List[int]],
    basis: str = "jun-cc-pvdz",
) -> List[Dict]:
    try:
        import psi4
    except ImportError as exc:
        raise RuntimeError("Psi4 is not installed in this environment.") from exc

    mol = psi4.geometry(molecule)
    psi4.set_options(
        {
            "basis": basis,
            "scf_type": "df",
            "guess": "sad",
            "freeze_core": "true",
            "FISAPT_FSAPT_FILEPATH": "none",
        }
    )

    _, wfn = psi4.energy("fisapt0", molecule=mol, return_wfn=True)
    data = psi4.fsapt_analysis(
        source=wfn,
        fragments_a=fragments_a,
        fragments_b=fragments_b,
    )
    df = pd.DataFrame(data)
    return standardize_rows(
        df, source="psi4", fragments_a=fragments_a, fragments_b=fragments_b
    )
