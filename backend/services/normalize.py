from __future__ import annotations

from typing import Dict, List

import pandas as pd


CANONICAL_COMPONENTS = ["Elst", "Exch", "IndAB", "IndBA", "Disp", "EDisp", "Total"]

ALIASES = {
    "Elst": ["Elst", "elst", "F-Electrostatics"],
    "Exch": ["Exch", "exch", "F-Exchange"],
    "IndAB": ["IndAB", "indab", "indu", "F-Induction"],
    "IndBA": ["IndBA", "indba"],
    "Disp": ["Disp", "disp", "F-Dispersion"],
    "EDisp": ["EDisp", "edisp"],
    "Total": ["Total", "total", "F-Total"],
}


def _extract_pair_names(df: pd.DataFrame) -> pd.DataFrame:
    if "Frag1" in df.columns and "Frag2" in df.columns:
        return df

    if "fA-fB" not in df.columns:
        raise ValueError(
            "Missing fragment-pair identifiers (expected 'Frag1/Frag2' or 'fA-fB')"
        )

    pair_split = df["fA-fB"].astype(str).str.split("-", n=1, expand=True)
    df = df.copy()
    df["Frag1"] = pair_split[0]
    df["Frag2"] = pair_split[1]
    return df


def _extract_component(df: pd.DataFrame, key: str) -> pd.Series:
    for alias in ALIASES[key]:
        if alias in df.columns:
            return pd.to_numeric(df[alias], errors="coerce").fillna(0.0)
    return pd.Series([0.0] * len(df), index=df.index)


def standardize_rows(
    df: pd.DataFrame,
    source: str,
    fragments_a: Dict[str, List[int]],
    fragments_b: Dict[str, List[int]],
) -> List[Dict]:
    df = _extract_pair_names(df)
    rows: List[Dict] = []

    for idx, row in df.iterrows():
        frag1 = str(row["Frag1"])
        frag2 = str(row["Frag2"])
        normalized = {
            "source": source,
            "row_index": int(idx),
            "Frag1": frag1,
            "Frag2": frag2,
            "Frag1_indices": fragments_a.get(frag1, []),
            "Frag2_indices": fragments_b.get(frag2, []),
        }

        for component in CANONICAL_COMPONENTS:
            normalized[component] = float(
                _extract_component(df.iloc[[idx]], component).iloc[0]
            )

        rows.append(normalized)

    return rows
