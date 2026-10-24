import { NavLink, useNavigate } from 'react-router-dom';
import { Sparkles, LayoutDashboard, FileText, MessageSquare, History, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/',              label: 'Dashboard',     icon: LayoutDashboard,  end: true },
  { to: '/documents',     label: 'Documents',     icon: FileText },
  { to: '/chat',          label: 'Chat',          icon: MessageSquare },
  { to: '/conversations', label: 'History',       icon: History },
  { to: '/settings/ai',   label: 'AI Provider',   icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Sparkles size={18} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">RAG App</div>
          <div className="sidebar-logo-sub">AI Document Q&amp;A</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">User</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-icon"
            title="Sign out"
            id="logout-btn"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
