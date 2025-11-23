import React, { useEffect, useState } from 'react';
import FileUpload from '../components/FileUpload';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HistoryPanel, { HistoryItem } from '../components/HistoryPanel';

interface Props {
  token: string | null;
  onToken: (token: string) => void;
}

const DashboardPage: React.FC<Props> = ({ token, onToken }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!token) return;
      const response = await axios.get('/api/comparisons/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(response.data);
    };
    loadHistory();
  }, [token]);

  const handleAuth = async (action: 'login' | 'register') => {
    const response = await axios.post(`/api/auth/${action}`, { email, password });
    onToken(response.data.token);
    setStatus(`${action} successful`);
  };

  const onFilesSelected = (payload: { files: FileList | null; carModel: string; trackCategory: string; trackName: string }) => {
    if (!payload.files || payload.files.length !== 2) {
      setStatus('Please select two setup files');
      return;
    }
    if (!token) {
      setStatus('Please login first');
      return;
    }
    navigate('/compare', { state: payload });
  };

  const viewComparison = (id: string) => {
    navigate('/history', { state: { selectedId: id } });
  };

  const deleteComparison = async (id: string) => {
    if (!token) return;
    await axios.delete(`/api/comparisons/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const archiveComparison = async (id: string, status: 'active' | 'archived') => {
    if (!token) return;
    const response = await axios.post(
      `/api/comparisons/${id}/archive`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, status: response.data.status } : item)));
  };

  return (
    <div className="page">
      <header>
        <h1>SetupComparer</h1>
        <p>Compare iRacing setups with insights and history.</p>
      </header>
      <section className="auth">
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="actions">
          <button onClick={() => handleAuth('login')}>Login</button>
          <button onClick={() => handleAuth('register')}>Register</button>
        </div>
        {status && <p className="status">{status}</p>}
      </section>
      <FileUpload onSubmit={onFilesSelected} />
      <HistoryPanel items={history} onSelect={viewComparison} onDelete={deleteComparison} onArchive={archiveComparison} />
    </div>
  );
};

export default DashboardPage;
