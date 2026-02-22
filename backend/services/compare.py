from __future__ import annotations

from typing import Dict, List, Tuple

from backend.services.normalize import CANONICAL_COMPONENTS


def _pair_key(row: Dict) -> Tuple[str, str]:
    return row.get("Frag1", ""), row.get("Frag2", "")


def compare_rows(ml_rows: List[Dict], psi4_rows: List[Dict]) -> List[Dict]:
    ml_map = {_pair_key(row): row for row in ml_rows}
    psi4_map = {_pair_key(row): row for row in psi4_rows}
    pair_keys = sorted(set(ml_map.keys()) | set(psi4_map.keys()))

    compared: List[Dict] = []
    for key in pair_keys:
        ml_row = ml_map.get(key)
        psi4_row = psi4_map.get(key)

        ref_row = ml_row or psi4_row or {}
        item = {
            "Frag1": key[0],
            "Frag2": key[1],
            "Frag1_indices": ref_row.get("Frag1_indices", []),
            "Frag2_indices": ref_row.get("Frag2_indices", []),
        }

        for component in CANONICAL_COMPONENTS:
            ml_val = float(ml_row.get(component, 0.0)) if ml_row else 0.0
            psi4_val = float(psi4_row.get(component, 0.0)) if psi4_row else 0.0
            err = ml_val - psi4_val
            item[f"ml_{component}"] = ml_val
            item[f"psi4_{component}"] = psi4_val
            item[f"err_{component}"] = err
            item[f"abs_err_{component}"] = abs(err)

        compared.append(item)

    return compared
