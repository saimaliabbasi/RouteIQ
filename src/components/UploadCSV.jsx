import React, { useRef, useState } from 'react';
import { parseCSV } from '../services/api';
import './UploadCSV.css';

export default function UploadCSV({ onLoad }) {
  const fileRef = useRef();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  const handleFile = (file) => {
    setError(null);
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Only .csv files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseCSV(e.target.result);
        setFileName(file.name);
        onLoad(result.nodes, result.edges);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
  };

  const onInputChange = (e) => handleFile(e.target.files[0]);
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  return (
    <div className="upload-section">
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V8m0 0l-3 3m3-3l3 3" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="3" y="3" width="18" height="18" rx="4" opacity="0.3"/>
        </svg>
        <p className="drop-label">
          {fileName ? (
            <><span className="file-name">{fileName}</span> loaded</>
          ) : (
            <><strong>Drop CSV</strong> or click to upload</>
          )}
        </p>
        <p className="drop-hint">Columns: source, target, weight</p>
        <input ref={fileRef} type="file" accept=".csv" onChange={onInputChange} style={{ display: 'none' }} />
      </div>

      {error && <div className="upload-error">{error}</div>}

      <div className="csv-example">
        <p className="label">Example format</p>
        <pre className="mono csv-code">source,target,weight{'\n'}Hub_A,Hub_B,5.0{'\n'}Hub_A,Hub_C,8.0</pre>
      </div>
    </div>
  );
}
