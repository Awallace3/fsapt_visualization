from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple


BOHR_TO_ANGSTROM = 0.529177210903


def parse_index_expression(value: Any) -> List[int]:
    if isinstance(value, list):
        return sorted({int(v) for v in value})

    if isinstance(value, int):
        return [value]

    if not isinstance(value, str):
        raise ValueError(f"Unsupported fragment index value: {type(value)}")

    out: List[int] = []
    tokens = [chunk.strip() for chunk in value.split(",") if chunk.strip()]
    for token in tokens:
        if "-" in token:
            start_s, end_s = token.split("-", 1)
            start = int(start_s)
            end = int(end_s)
            if end < start:
                raise ValueError(f"Invalid range '{token}'")
            out.extend(range(start, end + 1))
        else:
            out.append(int(token))

    return sorted(set(out))


def normalize_fragments_input(fragments: Dict[str, Any]) -> Dict[str, List[int]]:
    if not isinstance(fragments, dict) or not fragments:
        raise ValueError("Fragments must be a non-empty dictionary")

    normalized: Dict[str, List[int]] = {}
    for name, value in fragments.items():
        cleaned_name = str(name).strip()
        if not cleaned_name:
            raise ValueError("Fragment name cannot be empty")
        indices = parse_index_expression(value)
        if not indices:
            raise ValueError(f"Fragment '{cleaned_name}' has no indices")
        normalized[cleaned_name] = indices

    return normalized


def parse_molecule_string(molecule: str) -> Dict[str, Any]:
    if "--" not in molecule:
        raise ValueError("Molecule input must include '--' to separate monomers")

    lines = [line.rstrip() for line in molecule.strip().splitlines()]
    units = "angstrom"
    monomer_id = 1
    atoms: List[Dict[str, Any]] = []

    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if line == "--":
            monomer_id += 1
            continue

        lower = line.lower()
        if lower.startswith("units"):
            fields = line.split()
            if len(fields) >= 2:
                units = fields[1].lower()
            continue

        if lower.startswith(
            ("symmetry", "no_reorient", "no_com", "nocom", "noreorient")
        ):
            continue

        if re.match(r"^[-+]?\d+\s+[-+]?\d+$", line):
            continue

        parts = line.split()
        if len(parts) < 4:
            continue

        symbol = parts[0]
        try:
            x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
        except ValueError as exc:
            raise ValueError(f"Could not parse atom line: '{line}'") from exc

        atoms.append(
            {
                "index": len(atoms) + 1,
                "symbol": symbol,
                "x": x,
                "y": y,
                "z": z,
                "monomer": monomer_id,
            }
        )

    if monomer_id != 2:
        raise ValueError("Prototype expects exactly two monomers split by '--'")
    if not atoms:
        raise ValueError("No atoms parsed from molecule input")

    if units == "bohr":
        for atom in atoms:
            atom["x"] *= BOHR_TO_ANGSTROM
            atom["y"] *= BOHR_TO_ANGSTROM
            atom["z"] *= BOHR_TO_ANGSTROM

    monomer_a_indices = [atom["index"] for atom in atoms if atom["monomer"] == 1]
    monomer_b_indices = [atom["index"] for atom in atoms if atom["monomer"] == 2]

    xyz_lines = [str(len(atoms)), "fsapt-visualization"]
    for atom in atoms:
        xyz_lines.append(
            f"{atom['symbol']} {atom['x']:.8f} {atom['y']:.8f} {atom['z']:.8f}"
        )

    return {
        "atoms": atoms,
        "units": "angstrom",
        "monomer_a_indices": monomer_a_indices,
        "monomer_b_indices": monomer_b_indices,
        "xyz": "\n".join(xyz_lines),
    }


def validate_fragments_against_monomers(
    fragments_a: Dict[str, List[int]],
    fragments_b: Dict[str, List[int]],
    monomer_a_indices: List[int],
    monomer_b_indices: List[int],
) -> Tuple[Dict[str, List[int]], Dict[str, List[int]]]:
    allowed_a = set(monomer_a_indices)
    allowed_b = set(monomer_b_indices)

    for name, indices in fragments_a.items():
        invalid = sorted(set(indices) - allowed_a)
        if invalid:
            raise ValueError(
                f"Fragment A '{name}' contains indices outside monomer A: {invalid}"
            )

    for name, indices in fragments_b.items():
        invalid = sorted(set(indices) - allowed_b)
        if invalid:
            raise ValueError(
                f"Fragment B '{name}' contains indices outside monomer B: {invalid}"
            )

    return fragments_a, fragments_b
