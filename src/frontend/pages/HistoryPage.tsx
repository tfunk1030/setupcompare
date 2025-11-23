import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import HistoryPanel, { HistoryItem } from '../components/HistoryPanel';
import ComparisonView from '../components/ComparisonView';
import InterpretationPanel from '../components/InterpretationPanel';
import TelemetryPanel from '../components/TelemetryPanel';
import { ParameterDelta, TelemetrySummary } from '../../shared/types';

interface Props {
  token: string | null;
}

const HistoryPage: React.FC<Props> = ({ token }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<ParameterDelta[] | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!token) return;
      const response = await axios.get('/api/comparisons/history', { headers: { Authorization: `Bearer ${token}` } });
      setHistory(response.data);
    };
    fetchHistory();
  }, [token]);

  useEffect(() => {
    const state = location.state as { selectedId?: string } | undefined;
    if (state?.selectedId) loadComparison(state.selectedId);
  }, [location.state]);

  const loadComparison = async (id: string) => {
    if (!token) return;
    const response = await axios.get(`/api/comparisons/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    setSelected(response.data.deltas);
    setTelemetry(response.data.telemetry || null);
  };

  return (
    <div className="page">
      <h2>History</h2>
      <HistoryPanel items={history} onSelect={loadComparison} />
      {selected && (
        <div className="grid">
          <ComparisonView deltas={selected} />
          <InterpretationPanel deltas={selected} />
        </div>
      )}
      {telemetry && <TelemetryPanel telemetry={telemetry} />}
    </div>
  );
};

export default HistoryPage;
