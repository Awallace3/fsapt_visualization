from __future__ import annotations

import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, List, cast


REQUIRED_FSAPT_FILES = {
    "geom.xyz",
    "fA.dat",
    "fB.dat",
    "QA.dat",
    "QB.dat",
    "ZA.dat",
    "ZB.dat",
    "Elst.dat",
    "Exch.dat",
    "IndAB.dat",
    "IndBA.dat",
}


def _safe_extract_zip(zip_path: Path, output_dir: Path) -> None:
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            member_path = Path(member.filename)
            if member_path.is_absolute() or ".." in member_path.parts:
                raise ValueError("Zip archive contains invalid paths")
        zf.extractall(output_dir)


def _flatten_single_root_dir(output_dir: Path) -> Path:
    entries = [entry for entry in output_dir.iterdir() if entry.name != "__MACOSX"]
    if len(entries) == 1 and entries[0].is_dir():
        return entries[0]
    return output_dir


def _ensure_required_files(data_dir: Path) -> None:
    found = {path.name for path in data_dir.iterdir() if path.is_file()}
    missing = sorted(REQUIRED_FSAPT_FILES - found)
    if missing:
        raise ValueError(f"Missing required FSAPT files in zip: {missing}")


def _normalize_fragment_files(data_dir: Path) -> None:
    for filename in ("fA.dat", "fB.dat"):
        path = data_dir / filename
        lines = path.read_text().splitlines()
        normalized = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            parts = stripped.split(maxsplit=1)
            if len(parts) == 1:
                normalized.append(parts[0])
                continue
            frag_name, raw_indices = parts
            cleaned_indices = raw_indices.replace(",", " ")
            cleaned_indices = " ".join(
                token for token in cleaned_indices.split() if token
            )
            normalized.append(f"{frag_name} {cleaned_indices}")
        path.write_text("\n".join(normalized) + "\n")


def _build_parsed_from_geom(data_dir: Path) -> Dict:
    from example_fsapt.fsapt import read_list, read_xyz

    geom = read_xyz(str(data_dir / "geom.xyz"))
    z_a = read_list(str(data_dir / "ZA.dat"))
    z_b = read_list(str(data_dir / "ZB.dat"))
    if len(z_a) != len(geom) or len(z_b) != len(geom):
        raise ValueError("ZA.dat and ZB.dat must align with geom.xyz atom count")

    monomer_a_indices = [idx + 1 for idx, value in enumerate(z_a) if abs(value) > 1e-8]
    monomer_b_indices = [idx + 1 for idx, value in enumerate(z_b) if abs(value) > 1e-8]
    monomer_a_set = set(monomer_a_indices)
    monomer_b_set = set(monomer_b_indices)

    atoms = []
    xyz_lines = [str(len(geom)), "uploaded-fsapt"]
    for idx, row in enumerate(geom, start=1):
        symbol, x, y, z = row[0], float(row[1]), float(row[2]), float(row[3])
        if idx in monomer_a_set:
            monomer = 1
        elif idx in monomer_b_set:
            monomer = 2
        else:
            monomer = 1
        atoms.append(
            {
                "index": idx,
                "symbol": symbol,
                "x": x,
                "y": y,
                "z": z,
                "monomer": monomer,
            }
        )
        xyz_lines.append(f"{symbol} {x:.8f} {y:.8f} {z:.8f}")

    return {
        "atoms": atoms,
        "units": "angstrom",
        "monomer_a_indices": monomer_a_indices,
        "monomer_b_indices": monomer_b_indices,
        "xyz": "\n".join(xyz_lines),
    }


def _rows_from_fsapt_data(data: Dict[str, List]) -> List[Dict]:
    size = len(data.get("Frag1", []))
    rows: List[Dict] = []
    for i in range(size):
        frag1 = data["Frag1"][i]
        frag2 = data["Frag2"][i]
        if frag1 == "All" or frag2 == "All":
            continue
        row = {
            "Frag1": frag1,
            "Frag2": frag2,
            "Frag1_indices": data.get("Frag1_indices", [[]])[i],
            "Frag2_indices": data.get("Frag2_indices", [[]])[i],
            "ml_Total": 0.0,
            "ml_Elst": 0.0,
            "ml_Exch": 0.0,
            "ml_IndAB": 0.0,
            "ml_IndBA": 0.0,
            "ml_Disp": 0.0,
            "psi4_Total": float(data.get("Total", [0.0])[i]),
            "psi4_Elst": float(data.get("Elst", [0.0])[i]),
            "psi4_Exch": float(data.get("Exch", [0.0])[i]),
            "psi4_IndAB": float(data.get("IndAB", [0.0])[i]),
            "psi4_IndBA": float(data.get("IndBA", [0.0])[i]),
            "psi4_Disp": float(data.get("Disp", [0.0])[i]),
        }
        rows.append(row)
    return rows


def process_uploaded_fsapt_zip(zip_bytes: bytes) -> Dict:
    temp_root = Path(tempfile.mkdtemp(prefix="fsapt_upload_"))
    zip_path = temp_root / "upload.zip"
    data_dir = temp_root / "unzipped"
    data_dir.mkdir(parents=True, exist_ok=True)

    try:
        zip_path.write_bytes(zip_bytes)
        _safe_extract_zip(zip_path, data_dir)
        fsapt_dir = _flatten_single_root_dir(data_dir)
        _ensure_required_files(fsapt_dir)
        _normalize_fragment_files(fsapt_dir)

        from example_fsapt.fsapt import run_from_output

        fsapt_data = run_from_output(str(fsapt_dir), return_data="reduced_analysis")
        if fsapt_data is None:
            raise RuntimeError("fsapt.py did not return reduced analysis data")
        rows = _rows_from_fsapt_data(cast(Dict[str, List], fsapt_data))
        parsed = _build_parsed_from_geom(fsapt_dir)

        return {
            "rows": rows,
            "parsed": parsed,
            "required_files": sorted(REQUIRED_FSAPT_FILES),
        }
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)
