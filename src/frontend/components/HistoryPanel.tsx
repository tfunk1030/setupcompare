import React from 'react';

export interface HistoryItem {
  id: string;
  baselineName: string;
  candidateName: string;
  createdAt: string;
  shareId?: string;
  carModel?: string;
  trackName?: string;
  trackCategory?: string;
  status?: 'active' | 'archived';
}

interface Props {
  items: HistoryItem[];
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string, status: 'active' | 'archived') => void;
}

const HistoryPanel: React.FC<Props> = ({ items, onSelect, onDelete, onArchive }) => {
  return (
    <div className="history-panel">
      <h3>Past Comparisons</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <div className="history-row">
              <div className="history-meta">
                <div className="history-title">{item.carModel || 'Unknown car'}</div>
                <div className="history-sub">{item.trackName || 'Unknown track'}</div>
                {item.trackCategory && <div className="history-tag">{item.trackCategory}</div>}
                <small className="muted">{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <div className="history-actions">
                <button onClick={() => onSelect(item.id)}>View</button>
                {onArchive && (
                  <button onClick={() => onArchive(item.id, item.status === 'archived' ? 'active' : 'archived')}>
                    {item.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </button>
                )}
                {onDelete && <button onClick={() => onDelete(item.id)}>Delete</button>}
              </div>
            </div>
            {item.shareId && (
              <a href={`/api/comparisons/shared/${item.shareId}`} target="_blank" rel="noreferrer">
                Share link
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryPanel;
