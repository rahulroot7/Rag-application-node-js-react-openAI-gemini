import { useEffect, useState } from 'react';
import { MessageSquare, Trash2, ChevronRight, Bot, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { conversationsApi } from '../lib/api';

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  useEffect(() => {
    conversationsApi
      .list()
      .then((r) => setConversations(r.data.data?.conversations || []))
      .catch(() => toast.error('Failed to load conversations'))
      .finally(() => setLoading(false));
  }, []);

  const loadMessages = (conv) => {
    setSelected(conv);
    setMsgsLoading(true);
    conversationsApi
      .getMessages(conv._id)
      .then((r) => setMessages(r.data.data?.messages || []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setMsgsLoading(false));
  };

  const deleteConv = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await conversationsApi.delete(id);
      toast.success('Deleted');
      setConversations((c) => c.filter((x) => x._id !== id));
      if (selected?._id === id) { setSelected(null); setMessages([]); }
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Conversation History</h2>
          <p>Browse your past Q&amp;A sessions</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
          {/* Conversation List */}
          <div style={{ width: '340px', flexShrink: 0 }}>
            <div className="section-title">
              All Conversations <span>({conversations.length})</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <div className="spinner" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>No conversations yet</h3>
                <p>Start chatting with your documents</p>
              </div>
            ) : (
              <div className="doc-list">
                {conversations.map((c) => (
                  <div
                    key={c._id}
                    className={`doc-item${selected?._id === c._id ? ' card' : ''}`}
                    style={{ cursor: 'pointer', borderColor: selected?._id === c._id ? 'var(--accent)' : undefined }}
                    onClick={() => loadMessages(c)}
                    id={`hist-conv-${c._id}`}
                  >
                    <div className="doc-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
                      <MessageSquare size={18} />
                    </div>
                    <div className="doc-info">
                      <div className="doc-name">{c.title || 'Untitled'}</div>
                      <div className="doc-meta">
                        {new Date(c.updatedAt || c.createdAt).toLocaleDateString()} &middot; {c.messageCount || 0} messages
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={(e) => deleteConv(c._id, e)}
                        id={`del-conv-${c._id}`}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Viewer */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '400px' }}>
            {!selected ? (
              <div className="empty-state" style={{ margin: 'auto' }}>
                <div className="empty-state-icon">📖</div>
                <h3>Select a conversation</h3>
                <p>Click a conversation on the left to view its messages</p>
              </div>
            ) : msgsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0', margin: 'auto' }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selected.title || 'Untitled'}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(selected.updatedAt || selected.createdAt).toLocaleString()} &middot; {messages.length} messages
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`msg ${msg.role}`}>
                      <div className="msg-avatar">
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className="msg-bubble">
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        {msg.citations?.length > 0 && (
                          <div className="citations-wrap">
                            {msg.citations.map((c, ci) => (
                              <span key={ci} className="citation-chip">{c.originalFilename}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
