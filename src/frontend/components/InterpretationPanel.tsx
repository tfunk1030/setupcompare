import React, { useMemo, useState } from 'react';
import { ParameterDelta, SetupAnalysisSummary } from '../../shared/types';

interface Props {
  deltas: ParameterDelta[];
  activeKey?: string | null;
  onSelect?: (key: string | null) => void;
  summary?: SetupAnalysisSummary;
}

const InterpretationPanel: React.FC<Props> = ({ deltas, activeKey, onSelect, summary }) => {
  const [mode, setMode] = useState<'short' | 'full'>('short');
  const highlights = useMemo(() => deltas.filter((d) => d.interpretation), [deltas]);

  return (
    <aside className="interpretation">
      <div className="interpretation__header">
        <h3>What this means on track</h3>
        <div className="toggle">
          <button className={mode === 'short' ? 'active' : ''} onClick={() => setMode('short')}>
            Short hint
          </button>
          <button className={mode === 'full' ? 'active' : ''} onClick={() => setMode('full')}>
            Full explanation
          </button>
        </div>
      </div>
      {summary && (
        <div className="summary-block">
          <p className="muted">{mode === 'short' ? summary.combinedShort : summary.combinedFull}</p>
          <ul>
            <li>
              <strong>Overall:</strong> {summary.overallEffect}
            </li>
            <li>
              <strong>Balance:</strong> {summary.balance}
            </li>
            <li>
              <strong>Recommendations:</strong> {summary.recommendations.join('; ')}
            </li>
          </ul>
        </div>
      )}
      {highlights.length === 0 && <p className="muted">No significant changes detected.</p>}
      <ul className="interpretation-list">
        {highlights.map((delta) => (
          <li
            key={delta.key}
            className={`interpretation-item ${delta.key === activeKey ? 'active' : ''}`}
            onMouseEnter={() => onSelect?.(delta.key)}
            onMouseLeave={() => onSelect?.(null)}
            onClick={() => onSelect?.(delta.key)}
          >
            <div className="item-header">
              <strong>{delta.label}</strong>
              <small className="muted">Δ {delta.delta}</small>
            </div>
            <p>{mode === 'full' ? delta.interpretation?.full : delta.interpretation?.short}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default InterpretationPanel;
