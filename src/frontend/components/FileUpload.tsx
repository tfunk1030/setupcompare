import React, { useState } from 'react';

interface Props {
  onSubmit: (payload: { files: FileList | null; carModel: string; trackCategory: string; trackName: string }) => void;
}

const FileUpload: React.FC<Props> = ({ onSubmit }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [carModel, setCarModel] = useState('GT3');
  const [trackCategory, setTrackCategory] = useState('road');
  const [trackName, setTrackName] = useState('');

  return (
    <div className="upload-card">
      <h3>Upload two iRacing setup (.sto) files</h3>
      <input type="file" accept=".sto" multiple onChange={(e) => setFiles(e.target.files)} />
      <div className="upload-grid">
        <label>
          Car Model
          <select value={carModel} onChange={(e) => setCarModel(e.target.value)}>
            <option value="GT3">GT3</option>
            <option value="Prototype">Prototype</option>
            <option value="Oval">Oval</option>
          </select>
        </label>
        <label>
          Track Category
          <select value={trackCategory} onChange={(e) => setTrackCategory(e.target.value)}>
            <option value="road">Road</option>
            <option value="short-oval">Short Oval</option>
            <option value="superspeedway">Superspeedway</option>
          </select>
        </label>
        <label>
          Track Name (optional)
          <input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Spa, Daytona, etc." />
        </label>
      </div>
      <button onClick={() => onSubmit({ files, carModel, trackCategory, trackName })}>Start comparison</button>
      <p className="helper">We parse sections like suspension, aero, alignment, fuel, tyres, and more.</p>
    </div>
  );
};

export default FileUpload;
