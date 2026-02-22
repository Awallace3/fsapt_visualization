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
    # Output
    """
==> AP2-FSAPT <==
monA-monB full IE: [-0.29375741 -1.2566781   4.3386631  -0.46969554 -2.90604687]

 Frag1      Frag2         Elst       Exch       Ind        Disp       Total

0 1
--
0 1
C                    21.809329210000    52.318957510000    25.881689010000
H                    23.544097800000    51.306064310000    25.409257480000
C                    20.390144890000    52.846191100000    23.443942310000
H                    19.949838710000    51.049061550000    22.533094320000
H                    18.668604390000    53.883650740000    23.891807400000
H                    21.624136050000    53.985695950000    22.226958690000
H                    20.604383140000    51.145191920000    27.102905630000
H                    22.275883700000    54.092956810000    26.859565590000
--
0 1
C                    20.034876380000    46.899222980000    12.218969130000
O                    20.703839430000    45.051070830000    13.422724670000
N                    19.233632500000    49.025164870000    13.360363710000
C                    19.069226330000    49.616649150000    16.017318640000
C                    17.710513250000    52.137543800000    16.327233720000
C                    21.629805230000    49.805621760000    17.179500210000
C                    17.636813930000    47.715584670000    17.540437900000
H                    18.659155760000    50.434900560000    12.277550640000
H                    18.723406450000    53.613419910000    15.293553530000
H                    15.805669310000    51.899438310000    15.558115190000
H                    17.606578310000    52.621313690000    18.341681770000
H                    18.532544110000    45.886329780000    17.309891310000
H                    17.708623520000    48.327855930000    19.518981150000
H                    15.737639170000    47.747710010000    16.818562520000
H                    21.331228500000    50.221361510000    19.169381820000
H                    22.620021720000    51.304174580000    16.223298790000
H                    22.548212130000    47.985815500000    16.926276910000
H                    20.068853660000    46.976701750000    10.141991930000
units bohr
no_com
no_reorient

LIGAND     Peptide_B    0.010397   0.008084   0.031633  -0.064991  -0.014877
LIGAND     T-Butyl_B   -1.267077   4.330580  -0.501329  -2.841057  -0.278882
{'LIGAND': [1, 2, 3, 4, 5, 6, 7, 8]}
{'Peptide_B': [9, 10, 11, 16, 26],
 'T-Butyl_B': [12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25]}
              fA-fB   F-Total  F-Electrostatics  F-Exchange  F-Induction  F-Dispersion
0  LIGAND-Peptide_B -0.014877          0.010397    0.008084     0.031633     -0.064991
1  LIGAND-T-Butyl_B -0.278882         -1.267077    4.330580    -0.501329     -2.841057

    """
    return


if __name__ == "__main__":
    test_ap3_fused_fsapt_energies_mocking_test()
