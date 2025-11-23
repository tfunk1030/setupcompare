import React from 'react';
import { ParameterDelta, SetupFile } from '../../shared/types';

interface Props {
  baseline: SetupFile | null;
  candidate: SetupFile | null;
  deltas: ParameterDelta[];
}

const ExportTools: React.FC<Props> = ({ baseline, candidate, deltas }) => {
  const exportCsv = () => {
    const header = 'Parameter,Old,New,Delta,Unit,Insight\n';
    const body = deltas
      .map((d) => `${d.label},${d.previousValue},${d.newValue},${d.delta},${d.unit || ''},${d.insight || ''}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'setup-comparison.csv';
    link.click();
  };

  const exportPdf = () => {
    const doc = new Blob([
      `SetupComparer Report\nBaseline: ${baseline?.name}\nCandidate: ${candidate?.name}\n\n${deltas
        .map((d) => `${d.label}: ${d.previousValue} -> ${d.newValue} (Δ ${d.delta}) ${d.insight || ''}`)
        .join('\n')}`,
    ], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(doc);
    link.download = 'setup-comparison.pdf';
    link.click();
  };

  return (
    <div className="export-tools">
      <h4>Export</h4>
      <button onClick={exportCsv}>Export CSV</button>
      <button onClick={exportPdf}>Export PDF</button>
    </div>
  );
};

export default ExportTools;
