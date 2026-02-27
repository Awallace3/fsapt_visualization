from __future__ import annotations

import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple, cast


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


def _list_files(data_dir: Path) -> List[str]:
    return sorted(path.name for path in data_dir.iterdir() if path.is_file())


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


def _read_psi4mol(data_dir: Path) -> str | None:
    """Read geom.psi4mol if present and return its contents as a molecule string."""
    psi4mol_path = data_dir / "geom.psi4mol"
    if not psi4mol_path.is_file():
        return None
    text = psi4mol_path.read_text().strip()
    if not text:
        return None
    return text


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


def _extract_zip_payload(zip_bytes: bytes) -> Tuple[Path, Path]:
    temp_root = Path(tempfile.mkdtemp(prefix="fsapt_upload_"))
    zip_path = temp_root / "upload.zip"
    data_dir = temp_root / "unzipped"
    data_dir.mkdir(parents=True, exist_ok=True)
    zip_path.write_bytes(zip_bytes)
    _safe_extract_zip(zip_path, data_dir)
    fsapt_dir = _flatten_single_root_dir(data_dir)
    return temp_root, fsapt_dir


def _validate_fsapt_dir(fsapt_dir: Path) -> Dict:
    found_files = set(_list_files(fsapt_dir))
    missing_files = sorted(REQUIRED_FSAPT_FILES - found_files)

    if missing_files:
        return {
            "ok": False,
            "missing_files": missing_files,
            "invalid_files": [],
            "found_files": sorted(found_files),
            "required_files": sorted(REQUIRED_FSAPT_FILES),
        }

    from example_fsapt.fsapt import read_block, read_fragments, read_list, read_xyz

    invalid: List[str] = []

    try:
        geom = read_xyz(str(fsapt_dir / "geom.xyz"))
    except Exception:
        geom = []
        invalid.append("geom.xyz")

    natoms = len(geom)

    z_a = []
    z_b = []
    try:
        z_a = read_list(str(fsapt_dir / "ZA.dat"))
    except Exception:
        invalid.append("ZA.dat")
    try:
        z_b = read_list(str(fsapt_dir / "ZB.dat"))
    except Exception:
        invalid.append("ZB.dat")

    if natoms and z_a and len(z_a) != natoms:
        invalid.append("ZA.dat (atom count mismatch)")
    if natoms and z_b and len(z_b) != natoms:
        invalid.append("ZB.dat (atom count mismatch)")

    _normalize_fragment_files(fsapt_dir)

    f_a = None
    f_b = None
    try:
        f_a = read_fragments(str(fsapt_dir / "fA.dat"))[0]
    except Exception:
        invalid.append("fA.dat")
    try:
        f_b = read_fragments(str(fsapt_dir / "fB.dat"))[0]
    except Exception:
        invalid.append("fB.dat")

    for matrix_file in (
        "QA.dat",
        "QB.dat",
        "Elst.dat",
        "Exch.dat",
        "IndAB.dat",
        "IndBA.dat",
    ):
        try:
            read_block(str(fsapt_dir / matrix_file))
        except Exception:
            invalid.append(matrix_file)

    if natoms and f_a is not None and z_a:
        monomer_a = {idx for idx, value in enumerate(z_a) if abs(value) > 1e-8}
        for frag_name, indices in f_a.items():
            bad = sorted(idx + 1 for idx in indices if idx not in monomer_a)
            if bad:
                invalid.append(
                    f"fA.dat ({frag_name} has out-of-monomer indices: {bad[:8]})"
                )
                break

    if natoms and f_b is not None and z_b:
        monomer_b = {idx for idx, value in enumerate(z_b) if abs(value) > 1e-8}
        for frag_name, indices in f_b.items():
            bad = sorted(idx + 1 for idx in indices if idx not in monomer_b)
            if bad:
                invalid.append(
                    f"fB.dat ({frag_name} has out-of-monomer indices: {bad[:8]})"
                )
                break

    return {
        "ok": len(invalid) == 0,
        "missing_files": missing_files,
        "invalid_files": invalid,
        "found_files": sorted(found_files),
        "required_files": sorted(REQUIRED_FSAPT_FILES),
    }


def validate_uploaded_fsapt_zip(zip_bytes: bytes) -> Dict:
    temp_root, fsapt_dir = _extract_zip_payload(zip_bytes)
    try:
        return _validate_fsapt_dir(fsapt_dir)
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


def process_uploaded_fsapt_zip(zip_bytes: bytes) -> Dict:
    temp_root, fsapt_dir = _extract_zip_payload(zip_bytes)

    try:
        validation = _validate_fsapt_dir(fsapt_dir)
        if not validation["ok"]:
            missing = validation["missing_files"]
            invalid = validation["invalid_files"]
            details: List[str] = []
            if missing:
                details.append(f"missing files: {missing}")
            if invalid:
                details.append(f"invalid files: {invalid}")
            raise ValueError(
                "Uploaded FSAPT zip failed validation: " + "; ".join(details)
            )

        from example_fsapt.fsapt import run_from_output

        fsapt_data = run_from_output(str(fsapt_dir), return_data="reduced_analysis")
        if fsapt_data is None:
            raise RuntimeError("fsapt.py did not return reduced analysis data")
        rows = _rows_from_fsapt_data(cast(Dict[str, List], fsapt_data))
        parsed = _build_parsed_from_geom(fsapt_dir)

        molecule_string = _read_psi4mol(fsapt_dir)
        used_psi4mol = molecule_string is not None

        return {
            "rows": rows,
            "parsed": parsed,
            "molecule_string": molecule_string,
            "used_psi4mol": used_psi4mol,
            "required_files": sorted(REQUIRED_FSAPT_FILES),
            "validation": validation,
        }
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)
