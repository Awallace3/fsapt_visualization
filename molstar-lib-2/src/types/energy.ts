export type EnergyComponent = 'total' | 'elst' | 'exch' | 'ind' | 'disp';

export interface EnergyData {
  energies: {
    total: number[][];
    elst: number[][];
    exch: number[][];
    ind: number[][];
    disp: number[][];
  };
  atom_counts: {
    molecule_a: number;
    molecule_b: number;
  };
  total_energies: {
    total: number;
    elst: number;
    exch: number;
    ind: number;
    disp: number;
  };
}

export interface AtomSelection {
  moleculeA: number[];
  moleculeB: number[];
}

export interface PartialEnergySum {
  component: EnergyComponent;
  value: number;
  atomCountA: number;
  atomCountB: number;
}