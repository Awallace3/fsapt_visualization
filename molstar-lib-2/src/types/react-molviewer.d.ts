declare module 'react-molviewer' {
  import { ComponentProps } from 'react';
  
  export interface MolViewerProps {
    molContent: string;
    viewType: 'mol' | 'file';
    fnInit?: () => void;
    fnCb?: (applet: any) => void;
    jmScripts?: string[];
  }
  
  export const MolViewer: React.FC<MolViewerProps>;
}