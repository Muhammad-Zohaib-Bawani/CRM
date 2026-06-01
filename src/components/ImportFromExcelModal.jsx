import { useRef, useState } from 'react';

export default function ImportFromExcelModal({ onImport, onClose }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');

  const ACCEPTED = '.xlsx,.xls,.csv';

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Unsupported file type. Please upload .xlsx, .xls, or .csv');
      return;
    }
    setError('');
    setFile(f);
    // Prototype: generate mock preview rows from filename
    setPreview([
      { name: 'Preview User 1', email: 'user1@example.com', role: 'Owner' },
      { name: 'Preview User 2', email: 'user2@example.com', role: 'Manager' },
      { name: 'Preview User 3', email: 'user3@example.com', role: 'Owner' },
    ]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = () => {
    const picked = preview.map((row, i) => ({
      id: `excel-${Date.now()}-${i}`,
      name: row.name,
      email: row.email,
      initials: row.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      userType: row.role,
      status: 'Active',
    }));
    onImport(picked);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Import from Excel</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Upload an .xlsx, .xls, or .csv file. Expected columns: Name, Email, Role.
            </div>
          </div>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>

        <div className="modal-body" style={{ paddingTop: 20 }}>
          {/* Drop zone */}
          <div
            className={`excel-drop-zone ${file ? 'has-file' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <>
                <i className="fa-solid fa-file-excel" style={{ fontSize: 36, color: '#16a34a', marginBottom: 10 }} />
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to replace
                </div>
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-arrow-up" style={{ fontSize: 36, color: 'var(--brand)', marginBottom: 10 }} />
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Drop your file here or click to browse</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Supports .xlsx · .xls · .csv</div>
              </>
            )}
          </div>

          {error && (
            <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}

          {/* Template download hint */}
          <div style={{
            marginTop: 14, padding: '10px 14px', background: 'var(--brand-tint)',
            borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--brand-deep)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="fa-solid fa-circle-info" />
            Your file must have columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Role</strong>.
            Header row is required.
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Preview ({preview.length} rows detected)
              </div>
              <div className="import-table-wrap">
                <table className="import-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{row.email}</td>
                        <td><span className={`type-pill type-${row.role.toLowerCase()}`}>{row.role}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={preview.length === 0}
          >
            <i className="fa-solid fa-file-import" /> Import {preview.length || ''} {preview.length === 1 ? 'recipient' : 'recipients'}
          </button>
        </div>
      </div>
    </div>
  );
}
