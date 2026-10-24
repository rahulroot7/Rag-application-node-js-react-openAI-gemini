import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Trash2, RefreshCw, CloudUpload } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentsApi } from '../lib/api';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const fetchDocs = () => {
    setLoading(true);
    documentsApi
      .list()
      .then((res) => setDocs(res.data.data?.documents || []))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDocs(); }, []);

  const uploadFile = async (file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, DOCX, or TXT files are allowed');
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large (max 10 MB)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setProgress(0);

    try {
      await documentsApi.upload(formData, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      toast.success('Document uploaded successfully!');
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFileInput = (e) => uploadFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFile(e.dataTransfer.files[0]);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await documentsApi.delete(id);
      toast.success('Document deleted');
      setDocs((d) => d.filter((x) => x._id !== id));
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Documents</h2>
          <p>Upload and manage your knowledge base files</p>
        </div>
        <button id="refresh-docs-btn" className="btn btn-ghost btn-sm" onClick={fetchDocs}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="page-body">
        {/* Upload Zone */}
        <div
          className={`upload-zone${dragOver ? ' drag-over' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          id="upload-zone"
        >
          <div className="upload-zone-icon">
            <CloudUpload size={28} />
          </div>
          <h3>{uploading ? `Uploading… ${progress}%` : 'Drop a file here or click to browse'}</h3>
          <p>Supports PDF, DOCX, and TXT &middot; Max 10 MB</p>

          {uploading && (
            <div className="progress-bar-wrap" style={{ maxWidth: '300px', margin: '0.75rem auto 0' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={handleFileInput}
          id="file-input"
        />

        {/* Document List */}
        <div className="section-title">
          All Documents <span>({docs.length})</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="spinner" />
          </div>
        ) : docs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <h3>No documents yet</h3>
            <p>Upload a PDF, DOCX, or TXT file to build your knowledge base</p>
          </div>
        ) : (
          <div className="doc-list">
            {docs.map((doc) => (
              <div key={doc._id} className="doc-item">
                <div className="doc-icon">
                  <FileText size={18} />
                </div>
                <div className="doc-info">
                  <div className="doc-name" title={doc.originalFilename}>
                    {doc.originalFilename}
                  </div>
                  <div className="doc-meta">
                    {formatBytes(doc.fileSize)} &middot;{' '}
                    {doc.mimeType?.split('/').pop()?.toUpperCase()} &middot;{' '}
                    {new Date(doc.createdAt).toLocaleDateString()}
                    {doc.chunkCount != null && ` · ${doc.chunkCount} chunks`}
                  </div>
                </div>
                <span className={`doc-status ${doc.status}`}>{doc.status}</span>
                <button
                  className="btn btn-danger btn-icon btn-sm"
                  onClick={() => handleDelete(doc._id, doc.originalFilename)}
                  id={`delete-doc-${doc._id}`}
                  title="Delete document"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
