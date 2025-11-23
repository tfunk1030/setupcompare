import React from 'react';
import { ParameterDelta } from '../../shared/types';

interface Props {
  deltas: ParameterDelta[];
  activeKey?: string | null;
  onFocus?: (key: string | null) => void;
  onSelect?: (key: string) => void;
}

const colorForSignificance = (level: ParameterDelta['significance']) => {
  if (level === 'high') return '#e86a92';
  if (level === 'medium') return '#ffbf69';
  return '#d1e8ff';
};

const ComparisonView: React.FC<Props> = ({ deltas, activeKey, onFocus, onSelect }) => {
  return (
    <div className="comparison-view">
      <h3>Parameter Comparison</h3>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Old</th>
            <th>New</th>
            <th>Δ</th>
            <th>Insight</th>
          </tr>
        </thead>
        <tbody>
          {deltas.map((delta) => (
            <tr
              key={delta.key}
              className={delta.key === activeKey ? 'active-row' : ''}
              style={{ background: colorForSignificance(delta.significance) }}
              onMouseEnter={() => onFocus?.(delta.key)}
              onMouseLeave={() => onFocus?.(null)}
              onClick={() => onSelect?.(delta.key)}
            >
              <td>
                <strong>{delta.label}</strong>
                <small className="muted">{delta.category}</small>
              </td>
              <td>{delta.previousValue}</td>
              <td>{delta.newValue}</td>
              <td>
                {typeof delta.delta === 'number' ? delta.delta.toFixed(3) : delta.delta}
                {delta.unit ? ` ${delta.unit}` : ''}
              </td>
              <td>
                <div className="insight">
                  <div className="insight__summary">{delta.interpretation?.short || delta.insight || '—'}</div>
                  {delta.interpretation?.full && delta.key === activeKey && (
                    <div className="insight__details">{delta.interpretation.full}</div>
                  )}
                  {delta.interpretation?.full && (
                    <button className="link" onClick={() => onSelect?.(delta.key)}>
                      {delta.key === activeKey ? 'Hide details' : 'Show details'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonView;
