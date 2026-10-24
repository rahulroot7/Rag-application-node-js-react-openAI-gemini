import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Plus, Trash2, Bot, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi, documentsApi, conversationsApi } from '../lib/api';

function TypingDots() {
  return (
    <div className="msg assistant">
      <div className="msg-avatar"><Bot size={14} /></div>
      <div className="msg-bubble">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [docs, setDocs] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, thinking]);

  // Load documents and conversations on mount
  useEffect(() => {
    documentsApi
      .list()
      .then((r) => {
        const ready = (r.data.data?.documents || []).filter((d) => d.status === 'completed');
        setDocs(ready);
      })
      .catch(() => {});

    conversationsApi
      .list()
      .then((r) => setConversations(r.data.data?.conversations || []))
      .catch(() => {});
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    conversationsApi
      .getMessages(activeConvId)
      .then((r) => setMessages(r.data.data?.messages || []))
      .catch(() => setMessages([]));
  }, [activeConvId]);

  const toggleDoc = (id) =>
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await conversationsApi.delete(id);
      setConversations((c) => c.filter((x) => x._id !== id));
      if (activeConvId === id) startNewChat();
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const payload = {
        question: text,
        ...(activeConvId && { conversationId: activeConvId }),
        ...(selectedDocs.length > 0 && { documentIds: selectedDocs }),
      };

      const res = await chatApi.send(payload);
      const { answer, conversationId, citations } = res.data.data;

      const assistantMsg = {
        role: 'assistant',
        content: answer,
        citations: citations || [],
      };

      setMessages((m) => [...m, assistantMsg]);

      // If new conversation, add to sidebar
      if (!activeConvId && conversationId) {
        setActiveConvId(conversationId);
        conversationsApi.list().then((r) =>
          setConversations(r.data.data?.conversations || [])
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to send message');
      setMessages((m) => m.slice(0, -1)); // remove optimistic user message
    } finally {
      setThinking(false);
    }
  }, [input, thinking, activeConvId, selectedDocs]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-layout" style={{ height: '100%' }}>
      {/* Conversations Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>Chats</h3>
          <button
            id="new-chat-btn"
            className="btn btn-icon btn-sm"
            onClick={startNewChat}
            title="New chat"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="conv-list">
          {conversations.length === 0 ? (
            <div style={{ padding: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c._id}
                className={`conv-item${activeConvId === c._id ? ' active' : ''}`}
                onClick={() => setActiveConvId(c._id)}
                id={`conv-${c._id}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <div className="conv-item-title">{c.title || 'Untitled'}</div>
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    style={{ width: 24, height: 24, flexShrink: 0 }}
                    onClick={(e) => deleteConversation(c._id, e)}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="conv-item-date">
                  {new Date(c.updatedAt || c.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Main */}
      <div className="chat-main">
        <div className="chat-header">
          <h3>
            {activeConvId
              ? conversations.find((c) => c._id === activeConvId)?.title || 'Conversation'
              : 'New Conversation'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {docs.length} documents ready
          </span>
        </div>

        {/* Messages */}
        <div className="messages-area">
          {messages.length === 0 && !thinking && (
            <div className="empty-state" style={{ margin: 'auto' }}>
              <div className="empty-state-icon">🤖</div>
              <h3>Ask anything about your documents</h3>
              <p>Select documents below and type your question</p>
            </div>
          )}

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
                      <span key={ci} className="citation-chip" title={c.originalFilename}>
                        📄 {c.originalFilename}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {thinking && <TypingDots />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          {/* Document selector chips */}
          {docs.length > 0 && (
            <div className="chat-doc-selector">
              <span>Documents:</span>
              {docs.map((d) => (
                <button
                  key={d._id}
                  className={`doc-chip${selectedDocs.includes(d._id) ? ' selected' : ''}`}
                  onClick={() => toggleDoc(d._id)}
                  id={`doc-chip-${d._id}`}
                  title={d.originalFilename}
                >
                  {d.originalFilename.length > 20
                    ? d.originalFilename.slice(0, 18) + '…'
                    : d.originalFilename}
                </button>
              ))}
              {selectedDocs.length === 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>(all documents)</span>
              )}
            </div>
          )}

          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              id="chat-input"
              className="chat-textarea"
              placeholder="Ask a question about your documents… (Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={thinking}
            />
            <button
              id="chat-send-btn"
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || thinking}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
