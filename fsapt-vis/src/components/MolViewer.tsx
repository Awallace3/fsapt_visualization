import React, { useEffect, useRef, useState } from 'react';
import * as $3Dmol from '3dmol';

interface MolViewerProps {
    xyzString: string;
    energies: {
        total: number[][];
        elst: number[][];
        exch: number[][];
        ind: number[][];
        disp: number[][];
    } | null;
    atomCounts: {
        molecule_a: number;
        molecule_b: number;
    } | null;
    onAtomSelect: (indicesA: number[], indicesB: number[]) => void;
    selectedComponent: 'total' | 'elst' | 'exch' | 'ind' | 'disp';
}

const MolViewer: React.FC<MolViewerProps> = ({ 
    xyzString, 
    energies, 
    atomCounts, 
    onAtomSelect,
    selectedComponent 
}) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [viewer, setViewer] = useState<any>(null);
    const [selectedAtoms, setSelectedAtoms] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!viewerRef.current) return;

        const v = $3Dmol.createViewer(viewerRef.current, {
            backgroundColor: 'white',
        });
        setViewer(v);

        return () => {
            // Cleanup if necessary
        };
    }, []);

    useEffect(() => {
        if (!viewer || !xyzString) return;

        viewer.clear();
        viewer.addModel(xyzString, "xyz");
        
        // Set initial style
        viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
        viewer.zoomTo();

        // Add click handling
        viewer.setClickable({}, true, (atom: any) => {
            handleAtomClick(atom.index);
        });

        viewer.render();
    }, [viewer, xyzString]);

    const applyVisualizationStyle = () => {
        if (!viewer) return;
        
        if (!atomCounts) {
            viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
            return;
        }

        // Color molecules A and B differently
        const numAtomsA = atomCounts.molecule_a;
        
        // Molecule A - blue tint
        for (let i = 0; i < numAtomsA; i++) {
            viewer.setStyle({ index: i }, { 
                stick: { colorscheme: 'Jmol' }, 
                sphere: { scale: 0.3, colorscheme: 'Jmol' } 
            });
        }

        // Molecule B - green tint
        const model = viewer.getModel(0);
        if (model) {
            const totalAtoms = model.selectedAtoms({}).length;
            for (let i = numAtomsA; i < totalAtoms; i++) {
                viewer.setStyle({ index: i }, { 
                    stick: { colorscheme: 'Jmol' }, 
                    sphere: { scale: 0.3, colorscheme: 'Jmol' } 
                });
            }
        }
    };

    const handleAtomClick = (index: number) => {
        setSelectedAtoms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    useEffect(() => {
        if (!viewer || !atomCounts) return;

        // Reapply base visualization
        applyVisualizationStyle();

        // Highlight selected atoms
        selectedAtoms.forEach(index => {
            viewer.setStyle({ index: index }, { 
                stick: { color: 'yellow', radius: 0.2 }, 
                sphere: { scale: 0.4, color: 'yellow' } 
            });
        });

        viewer.render();

        // Calculate indices for callback
        const indicesA: number[] = [];
        const relativeIndicesB: number[] = [];

        selectedAtoms.forEach(index => {
            if (index < atomCounts.molecule_a) {
                indicesA.push(index);
            } else {
                relativeIndicesB.push(index - atomCounts.molecule_a);
            }
        });

        onAtomSelect(indicesA, relativeIndicesB);

    }, [selectedAtoms, viewer, atomCounts]);

    // Apply heatmap coloring based on selected energy component
    useEffect(() => {
        if (!viewer || !energies || !atomCounts || !selectedComponent) return;

        const componentMatrix = energies[selectedComponent];
        if (!componentMatrix || componentMatrix.length === 0) return;

        // Calculate per-atom energy sums for visualization
        const numAtomsA = atomCounts.molecule_a;
        const numAtomsB = atomCounts.molecule_b;

        // Find min/max for color scaling
        let minEnergy = Infinity;
        let maxEnergy = -Infinity;

        for (let i = 0; i < numAtomsA; i++) {
            for (let j = 0; j < numAtomsB; j++) {
                const e = componentMatrix[i][j];
                if (e < minEnergy) minEnergy = e;
                if (e > maxEnergy) maxEnergy = e;
            }
        }

        // Color scale: blue (negative/attractive) -> white (0) -> red (positive/repulsive)
        const getColor = (value: number): string => {
            if (maxEnergy === minEnergy) return 'white';
            
            const normalized = (value - minEnergy) / (maxEnergy - minEnergy);
            
            if (value < 0) {
                // Blue for attractive (negative)
                const intensity = Math.min(255, Math.floor(255 * (1 - normalized * 2)));
                return `rgb(${intensity}, ${intensity}, 255)`;
            } else {
                // Red for repulsive (positive)
                const intensity = Math.min(255, Math.floor(255 * normalized));
                return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
            }
        };

        // Color molecule A atoms by sum of interactions with all B atoms
        for (let i = 0; i < numAtomsA; i++) {
            let sum = 0;
            for (let j = 0; j < numAtomsB; j++) {
                sum += componentMatrix[i][j];
            }
            const color = getColor(sum);
            
            // Keep selected atoms highlighted
            if (!selectedAtoms.has(i)) {
                viewer.setStyle({ index: i }, { 
                    stick: { color: color }, 
                    sphere: { scale: 0.3, color: color } 
                });
            }
        }

        // Color molecule B atoms by sum of interactions with all A atoms
        for (let j = 0; j < numAtomsB; j++) {
            let sum = 0;
            for (let i = 0; i < numAtomsA; i++) {
                sum += componentMatrix[i][j];
            }
            const color = getColor(sum);
            const globalIndex = numAtomsA + j;
            
            // Keep selected atoms highlighted
            if (!selectedAtoms.has(globalIndex)) {
                viewer.setStyle({ index: globalIndex }, { 
                    stick: { color: color }, 
                    sphere: { scale: 0.3, color: color } 
                });
            }
        }

        viewer.render();

    }, [viewer, energies, atomCounts, selectedComponent, selectedAtoms]);

    return (
        <div ref={viewerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
    );
};

export default MolViewer;
