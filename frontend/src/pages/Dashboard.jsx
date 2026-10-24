import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, MessageSquare, History, TrendingUp, Upload } from 'lucide-react';
import { documentsApi, conversationsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([documentsApi.list(), conversationsApi.list()])
      .then(([dr, cr]) => {
        setDocs(dr.data.data?.documents || []);
        setConvs(cr.data.data?.conversations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ready = docs.filter((d) => d.status === 'completed').length;
  const processing = docs.filter((d) => d.status === 'processing' || d.status === 'pending').length;

  const stats = [
    { icon: FileText,      color: 'purple', value: docs.length,   label: 'Documents'          },
    { icon: TrendingUp,    color: 'green',  value: ready,         label: 'Ready for Q&A'      },
    { icon: MessageSquare, color: 'amber',  value: convs.length,  label: 'Conversations'      },
    { icon: Upload,        color: 'red',    value: processing,    label: 'Processing'         },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
          <p>Here&apos;s an overview of your RAG workspace</p>
        </div>
        <Link to="/chat" className="btn btn-primary btn-sm">
          <MessageSquare size={15} />
          New Chat
        </Link>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div className="stats-grid">
              {stats.map(({ icon: Icon, color, value, label }) => (
                <div key={label} className="stat-card">
                  <div className={`stat-icon ${color}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Documents */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="section-title">
                  Recent Documents
                  <span>({docs.slice(0, 5).length})</span>
                </h3>
                <Link to="/documents" className="btn btn-ghost btn-sm">View all</Link>
              </div>
              {docs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <h3>No documents yet</h3>
                  <p>Upload PDFs, DOCX, or TXT files to get started</p>
                  <Link to="/documents" className="btn btn-primary btn-sm">Upload Document</Link>
                </div>
              ) : (
                <div className="doc-list">
                  {docs.slice(0, 5).map((doc) => (
                    <div key={doc._id} className="doc-item">
                      <div className="doc-icon"><FileText size={18} /></div>
                      <div className="doc-info">
                        <div className="doc-name">{doc.originalFilename}</div>
                        <div className="doc-meta">
                          {(doc.fileSize / 1024).toFixed(1)} KB &middot;{' '}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`doc-status ${doc.status}`}>{doc.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Conversations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="section-title">
                  Recent Conversations
                  <span>({convs.slice(0, 5).length})</span>
                </h3>
                <Link to="/conversations" className="btn btn-ghost btn-sm">View all</Link>
              </div>
              {convs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <h3>No conversations yet</h3>
                  <p>Start chatting with your uploaded documents</p>
                  <Link to="/chat" className="btn btn-primary btn-sm">Start Chat</Link>
                </div>
              ) : (
                <div className="doc-list">
                  {convs.slice(0, 5).map((c) => (
                    <Link key={c._id} to={`/conversations?id=${c._id}`} style={{ textDecoration: 'none' }}>
                      <div className="doc-item">
                        <div className="doc-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
                          <MessageSquare size={18} />
                        </div>
                        <div className="doc-info">
                          <div className="doc-name">{c.title || 'Untitled conversation'}</div>
                          <div className="doc-meta">{new Date(c.updatedAt || c.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span className="badge badge-green">{c.messageCount || 0} msgs</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
