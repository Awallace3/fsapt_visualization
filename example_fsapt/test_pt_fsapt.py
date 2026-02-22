import apnet_pt
from apnet_pt.pt_datasets.ap3_fused_fsapt_ds import (
    ap3_fused_fsapt_module_dataset_lmdb,
    ap3_fused_fsapt_collate_update,
)
from apnet_pt.AtomPairwiseModels.apnet3_fused import APNet3_AtomType_Model
import os
import numpy as np
import pytest
from glob import glob
import qcelemental as qcel
import torch
import pandas as pd
from pprint import pprint as pp
import shutil
import tempfile


torch.manual_seed(42)
spec_type = 5
# qcmlforge_dir = ~/gits/qcmlforge/tests/
qcmlforge_path = "~/gits/qcmlforge/tests"
qcmlforge_dir = os.path.expanduser(qcmlforge_path)
data_path = f"{qcmlforge_dir}/test_data_path"
am_path = f"{qcmlforge_dir}/../src/apnet_pt/models/am_ensemble/am_0.pt"

am_path = f"{qcmlforge_dir}/test_models/ap3_ensemble_0/am_3.pt"
at_hf_vw_path = f"{qcmlforge_dir}/test_models/ap3_ensemble_0/am_h+1_3.pt"
at_elst_path = f"{qcmlforge_dir}/test_models/ap3_ensemble_0/am_elst_h+1_3.pt"
ap3_path = f"{qcmlforge_dir}/test_models/ap3_ensemble_0/ap3_.pt"
am_hf_path = f"{qcmlforge_dir}/test_models/am_hf_0.pt"


@pytest.mark.skip("incomplete functionality")
def test_ap3_fused_fsapt_energies_mocking_test():
    """Test training AP3 fused model on FSAPT fragment energy data"""
    mol = qcel.models.Molecule.from_data(
        """
0 1
C   11.54100       27.68600       13.69600
H   12.45900       27.15000       13.44600
C   10.79000       27.96500       12.40600
H   10.55700       27.01400       11.92400
H   9.879000       28.51400       12.64300
H   11.44300       28.56800       11.76200
H   10.90337       27.06487       14.34224
H   11.78789       28.62476       14.21347
--
0 1
C   10.60200       24.81800       6.466000
O   10.95600       23.84000       7.103000
N   10.17800       25.94300       7.070000
C   10.09100       26.25600       8.476000
C   9.372000       27.59000       8.640000
C   11.44600       26.35600       9.091000
C   9.333000       25.25000       9.282000
H   9.874000       26.68900       6.497000
H   9.908000       28.37100       8.093000
H   8.364000       27.46400       8.233000
H   9.317000       27.84600       9.706000
H   9.807000       24.28200       9.160000
H   9.371000       25.57400       10.32900
H   8.328000       25.26700       8.900000
H   11.28800       26.57600       10.14400
H   11.97000       27.14900       8.585000
H   11.93200       25.39300       8.957000
H   10.61998       24.85900       5.366911
units angstrom

symmetry c1
no_reorient
no_com
"""
    )
    fAs = {
        "LIGAND": list(range(1, 9)),
    }
    fBs = {
        "Peptide_B": [9, 10, 11, 16, 26],
        "T-Butyl_B": [12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    }
    dimers = [mol]
    pred_IEs, pairwise_energies, df_out = (
        apnet_pt.pretrained_models.apnet3_model_predict_pairs(
            dimers,
            fAs=[fAs],
            fBs=[fBs],
            compile=False,
            print_results=True,
        )
    )
    pp(fAs)
    pp(fBs)
    df_out = df_out.rename(
        columns={
            "total": "F-Total",
            "elst": "F-Electrostatics",
            "exch": "F-Exchange",
            "indu": "F-Induction",
            "disp": "F-Dispersion",
        }
    )
    print(df_out)
    return


if __name__ == "__main__":
    test_ap3_fused_fsapt_energies_mocking_test()
