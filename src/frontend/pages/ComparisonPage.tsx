import React, { useState } from 'react';
import axios from 'axios';
import ComparisonView from '../components/ComparisonView';
import InterpretationPanel from '../components/InterpretationPanel';
import ExportTools from '../components/ExportTools';
import TelemetryPanel from '../components/TelemetryPanel';
import { ParameterDelta, SetupAnalysisSummary, SetupFile, TelemetrySummary } from '../../shared/types';

interface Props {
  token: string | null;
}

const ComparisonPage: React.FC<Props> = ({ token }) => {
  const [deltas, setDeltas] = useState<ParameterDelta[]>([]);
  const [baseline, setBaseline] = useState<SetupFile | null>(null);
  const [candidate, setCandidate] = useState<SetupFile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [summary, setSummary] = useState<SetupAnalysisSummary | null>(null);
  const [setupAFile, setSetupAFile] = useState<File | null>(null);
  const [setupBFile, setSetupBFile] = useState<File | null>(null);
  const [carModel, setCarModel] = useState('');
  const [trackName, setTrackName] = useState('');
  const [trackCategory, setTrackCategory] = useState('');

  const handleUpload = async () => {
    if (!setupAFile || !setupBFile || !token) {
      setStatus('Two setup files and a session are required');
      return;
    }
    const formData = new FormData();
    formData.append('setupA', setupAFile);
    formData.append('setupB', setupBFile);
    if (carModel) formData.append('carModel', carModel);
    if (trackCategory) formData.append('trackCategory', trackCategory);
    if (trackName) formData.append('trackName', trackName);
    const response = await axios.post('/api/comparisons/analyseSetupEffects', formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeltas(response.data.deltas || response.data.analysis?.deltas || response.data.summary?.deltas || []);
    setSummary(response.data.summary || null);
    setBaseline(response.data.baseline || null);
    setCandidate(response.data.candidate || null);
    setComparisonId(response.data.id || null);
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
      <h2>New Comparison</h2>
      <div className="upload-card">
        <div className="field-row">
          <div>
            <label>Baseline setup</label>
            <input type="file" onChange={(e) => setSetupAFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label>Candidate setup</label>
            <input type="file" onChange={(e) => setSetupBFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <div className="field-row">
          <input placeholder="Car model" value={carModel} onChange={(e) => setCarModel(e.target.value)} />
          <input placeholder="Track name" value={trackName} onChange={(e) => setTrackName(e.target.value)} />
          <input placeholder="Track category" value={trackCategory} onChange={(e) => setTrackCategory(e.target.value)} />
        </div>
        <button onClick={handleUpload}>Analyse setup effects</button>
        {status && <p className="status">{status}</p>}
      </div>

      {deltas.length > 0 && (
        <div className="grid">
          <ComparisonView
            deltas={deltas}
            activeKey={activeKey}
            onFocus={setActiveKey}
            onSelect={(key) => setActiveKey((current) => (current === key ? null : key))}
          />
          <InterpretationPanel
            deltas={deltas}
            activeKey={activeKey}
            onSelect={(key) => setActiveKey((current) => (current === key ? null : key))}
            summary={summary || undefined}
          />
        </div>
      )}

      {summary && (
        <div className="interpretation">
          <h3>What This Means On Track</h3>
          <p>{summary.combinedFull}</p>
          <ul>
            <li><strong>Overall:</strong> {summary.overallEffect}</li>
            <li><strong>Balance:</strong> {summary.balance}</li>
            <li><strong>Interactions:</strong> {summary.interactions.join(', ') || 'None'}</li>
          </ul>
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
