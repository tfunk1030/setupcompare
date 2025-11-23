import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import ComparisonView from '../components/ComparisonView';
import InterpretationPanel from '../components/InterpretationPanel';
import ExportTools from '../components/ExportTools';
import TelemetryPanel from '../components/TelemetryPanel';
import { ParameterDelta, SetupFile, TelemetrySummary } from '../../shared/types';

interface Props {
  token: string | null;
}

const ComparisonPage: React.FC<Props> = ({ token }) => {
  const location = useLocation();
  const [deltas, setDeltas] = useState<ParameterDelta[]>([]);
  const [baseline, setBaseline] = useState<SetupFile | null>(null);
  const [candidate, setCandidate] = useState<SetupFile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);

  const handleUpload = async () => {
    const state = location.state as { files?: FileList; carModel?: string; trackCategory?: string; trackName?: string };
    if (!state?.files || state.files.length !== 2 || !token) {
      setStatus('Missing files or session. Please start from Dashboard.');
      return;
    }
    const formData = new FormData();
    formData.append('files', state.files[0]);
    formData.append('files', state.files[1]);
    if (state.carModel) formData.append('carModel', state.carModel);
    if (state.trackCategory) formData.append('trackCategory', state.trackCategory);
    if (state.trackName) formData.append('trackName', state.trackName);
    const response = await axios.post('/api/comparisons/upload', formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeltas(response.data.deltas);
    setBaseline(response.data.baseline);
    setCandidate(response.data.candidate);
    setComparisonId(response.data.id);
    setStatus('Comparison ready');
  };

  const handleTelemetryUpload = async (file: File | null) => {
    if (!file || !comparisonId || !token) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('comparisonId', comparisonId);
    const response = await axios.post('/api/telemetry/upload', formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTelemetry(response.data.telemetry);
    setDeltas(response.data.deltas);
    setStatus('Telemetry attached and insights updated');
  };

  return (
    <div className="page">
      <h2>Comparison Results</h2>
      <button onClick={handleUpload}>Process Files</button>
      {status && <p className="status">{status}</p>}
      {deltas.length > 0 && (
        <div className="grid">
          <ComparisonView deltas={deltas} activeKey={activeKey} onFocus={setActiveKey} onSelect={setActiveKey} />
          <InterpretationPanel deltas={deltas} activeKey={activeKey} onSelect={setActiveKey} />
        </div>
      )}
      {comparisonId && (
        <div className="upload-card">
          <h4>Attach Telemetry (.ibt)</h4>
          <input type="file" accept=".ibt,.csv,.txt" onChange={(e) => handleTelemetryUpload(e.target.files?.[0] || null)} />
          <p className="muted">Optional: upload telemetry from the same session to correlate with setup changes.</p>
        </div>
      )}
      {telemetry && <TelemetryPanel telemetry={telemetry} />}
      <ExportTools baseline={baseline} candidate={candidate} deltas={deltas} />
    </div>
  );
};

export default ComparisonPage;
