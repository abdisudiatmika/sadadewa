import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isPos = location.pathname === '/pos';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      id="topnav"
      className="bg-surface/80 backdrop-blur-xl sticky top-0 z-40 border-b border-outline-variant flex justify-between items-center h-16 px-container-padding"
    >
      {/* Left: Brand / Search Context */}
      {isPos ? (
        <div className="flex items-center gap-card-gap flex-1">
          <span className="font-headline-lg text-headline-lg font-bold text-primary">EduPay Admin</span>
        </div>
      ) : (
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-64 group focus-within:ring-2 focus-within:ring-secondary rounded-lg transition-all">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary">
              search
            </span>
            <input
              id="search-input"
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-transparent"
              placeholder="Search students, invoices..."
              type="text"
            />
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <button
          id="btn-notifications"
          className="text-on-surface-variant hover:text-secondary transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button
          id="btn-history"
          className="text-on-surface-variant hover:text-secondary transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined">history</span>
        </button>

        <div className="h-6 w-[1px] bg-outline-variant mx-2" />

        <button
          id="btn-new-payment"
          className="bg-[#0D9488] text-white hover:bg-[#0f766e] transition-colors duration-200 font-tabular-nums text-tabular-nums px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
          onClick={() => navigate('/pos')}
        >
          <span className="material-symbols-outlined">add</span>
          New Payment
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 ml-2">
          <div className="text-right hidden md:block">
            <p className="font-label-md text-label-md text-on-surface m-0 leading-tight">{user?.name || 'User'}</p>
            <p className="font-label-md text-label-md text-on-surface-variant m-0 leading-tight capitalize text-[11px]">{user?.role || 'staff'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm cursor-pointer border border-outline-variant">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
          </div>
          <button
            onClick={handleLogout}
            className="text-on-surface-variant hover:text-error transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-error-container"
            title="Logout"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
