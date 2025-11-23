import React, { useMemo, useState } from 'react';
import { ParameterDelta } from '../../shared/types';

interface Props {
  deltas: ParameterDelta[];
  activeKey?: string | null;
  onSelect?: (key: string | null) => void;
}

const InterpretationPanel: React.FC<Props> = ({ deltas, activeKey, onSelect }) => {
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
