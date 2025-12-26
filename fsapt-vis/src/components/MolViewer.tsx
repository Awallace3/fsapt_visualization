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
}

const MolViewer: React.FC<MolViewerProps> = ({ xyzString, energies, atomCounts, onAtomSelect }) => {
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
        viewer.setStyle({}, { stick: {} });
        viewer.zoomTo();

        // Add click handling
        viewer.setClickable({}, true, (atom: any) => {
            handleAtomClick(atom.index);
        });

        viewer.render();
    }, [viewer, xyzString]);

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

        // Update selection visualization
        const model = viewer.getModel(0);
        if (!model) return;

        const atoms = model.selectedAtoms({});

        // Reset colors
        viewer.setStyle({}, { stick: {} });

        // Highlight selected
        selectedAtoms.forEach(index => {
            viewer.setStyle({ index: index }, { stick: { color: 'yellow', radius: 0.2 }, sphere: { scale: 0.3, color: 'yellow' } });
        });

        viewer.render();

        // Notify parent
        if (atomCounts) {
            const indicesA: number[] = [];
            const indicesB: number[] = [];

            selectedAtoms.forEach(index => {
                if (index < atomCounts.molecule_a) {
                    indicesA.push(index);
                } else {
                    indicesB.push(index - atomCounts.molecule_a); // Adjust index for B if needed, but usually energies matrix is (na, nb)
                    // Wait, the energies matrix is (na, nb).
                    // If index is in B, it corresponds to column index - atomCounts.molecule_a?
                    // Let's assume atoms are ordered A then B in the XYZ.
                    // Yes, app.py constructs it that way.
                }
            });

            // For B, we need the index relative to B start for the matrix lookup
            // But for the callback, let's pass the absolute indices or relative?
            // Let's pass relative indices for B to make matrix lookup easier.
            const relativeIndicesB: number[] = [];
            selectedAtoms.forEach(index => {
                if (index >= atomCounts.molecule_a) {
                    relativeIndicesB.push(index - atomCounts.molecule_a);
                }
            });

            onAtomSelect(indicesA, relativeIndicesB);
        }

    }, [selectedAtoms, viewer, atomCounts, onAtomSelect]);

    // Visualization of energies could go here (coloring atoms based on sum)
    // For now, just selection logic.

    return (
        <div ref={viewerRef} style={{ width: '100%', height: '600px', position: 'relative' }} />
    );
};

export default MolViewer;
