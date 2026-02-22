import pytest
import psi4
from psi4 import compare_values, variable
from addons import uusing
import numpy as np
import os
import shutil

pytestmark = [pytest.mark.psi, pytest.mark.api, pytest.mark.quick]

def test_fsapt_psivars():
    """
    Test F-SAPT analysis with pandas DataFrame output format.

    This test verifies that fsapt_analysis returns data compatible with pandas
    DataFrame construction after running a fisapt0 calculation. Uses the same
    two-methane system as test_fsapt_psivars_dict to validate consistency
    between output formats, and serves as an example of seemless pandas
    integration.

    Requires: pandas

    The test validates:
    1. Standard SAPT energy components against reference values
    2. F-SAPT energies extracted from DataFrame columns
    3. DataFrame structure with proper column names
    """
    import pandas as pd

    mol = psi4.geometry(
        """0 1
C 0.00000000 0.00000000 0.00000000
H 1.09000000 0.00000000 0.00000000
H -0.36333333 0.83908239 0.59332085
H -0.36333333 0.09428973 -1.02332709
H -0.36333333 -0.93337212 0.43000624
--
0 1
C 6.44536662 -0.26509169 -0.00000000
H 7.53536662 -0.26509169 -0.00000000
H 6.08203329 0.57399070 0.59332085
H 6.08203329 -0.17080196 -1.02332709
H 6.08203329 -1.19846381 0.43000624
symmetry c1
no_reorient
no_com"""
    )
    psi4.set_options(
        {
            "basis": "jun-cc-pvdz",
            "scf_type": "df",
            "guess": "sad",
            "freeze_core": "true",
            "FISAPT_FSAPT_FILEPATH": "none",
        }
    )
    e, wfn = psi4.energy("fisapt0", return_wfn=True)
    keys = ["Enuc", "Eelst", "Eexch", "Eind", "Edisp", "Etot"]
    Eref = {
        "Enuc": 35.07529824960602,
        "Eelst": -3.8035153870907834e-06,
        "Eexch": 1.7912112685446533e-07,
        "Eind": -3.833795151474493e-08,
        "Edisp": -3.288568662589654e-05,
        "Etot": -3.6548418837647605e-05,
    }
    Epsi = {
        "Enuc": mol.nuclear_repulsion_energy(),
        "Eelst": wfn.variable("SAPT ELST ENERGY"),
        "Eexch": wfn.variable("SAPT EXCH ENERGY"),
        "Eind": wfn.variable("SAPT IND ENERGY"),
        "Edisp": wfn.variable("SAPT DISP ENERGY"),
        "Etot": wfn.variable("SAPT0 TOTAL ENERGY"),
    }

    for key in keys:
        assert compare_values(Eref[key], Epsi[key], 6, key)
    data = psi4.fsapt_analysis(
        source=wfn,
        # NOTE: 1-indexed for fragments_a and fragments_b
        fragments_a={
            "MethylA": [1, 2, 3, 4, 5],
        },
        fragments_b={
            "MethylB": [6, 7, 8, 9, 10],
        },
    )
    df = pd.DataFrame(data)
    print(df)
    fEnergies = {}
    fkeys = [
        "fEelst",
        "fEexch",
        "fEindAB",
        "fEindBA",
        "fEdisp",
        "fEedisp",
        "fEtot",
    ]

    df_keys = [
        "Elst",
        "Exch",
        "IndAB",
        "IndBA",
        "Disp",
        "EDisp",
        "Total",
    ]

    # Get columns from dataframe that match fkeys
    Energies = df[df_keys].iloc[0].values

    for pair in zip(fkeys, Energies):
        fEnergies[pair[0]] = pair[1]

    fEref = {
        "fEelst": -0.002,
        "fEexch": 0.000,
        "fEindAB": -0.000,
        "fEindBA": -0.000,
        "fEdisp": -0.021,
        "fEedisp": 0.000,
        "fEtot": -0.023,
    }

    for key in fkeys:
        print(fEnergies[key], fEref[key])
        assert compare_values(fEref[key], fEnergies[key], 2, key)
