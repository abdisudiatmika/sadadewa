import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const mainNavItems = [
  { icon: 'dashboard', label: 'Dashboard', path: '/', roles: ['admin', 'superadmin', 'staff', 'bendahara_pemasukan', 'bendahara_pengeluaran', 'teacher'] },
  { icon: 'manage_accounts', label: 'Manajemen User', path: '/users', roles: ['admin', 'superadmin'] },
  { icon: 'point_of_sale', label: 'Kasir / Pembayaran', path: '/pos', roles: ['admin', 'superadmin', 'staff', 'bendahara_pemasukan'] },
  { icon: 'receipt_long', label: 'Riwayat Pembayaran', path: '/billing', roles: ['admin', 'superadmin', 'staff', 'bendahara_pemasukan'] },
  { icon: 'group', label: 'Data Siswa', path: '/students', roles: ['admin', 'superadmin', 'staff', 'bendahara_pemasukan', 'teacher'] },
  { icon: 'school', label: 'Master Kelas', path: '/master-classes', roles: ['admin', 'superadmin', 'staff', 'bendahara_pemasukan'] },
  { icon: 'payments', label: 'Master Biaya', path: '/fees', roles: ['admin', 'superadmin', 'staff', 'bendahara_pemasukan'] },
  { icon: 'account_balance_wallet', label: 'Pengeluaran', path: '/expenses', roles: ['admin', 'superadmin', 'staff', 'bendahara_pengeluaran'] },
  { icon: 'analytics', label: 'Laporan Keuangan', path: '/reports', roles: ['admin', 'superadmin', 'staff', 'bendahara_pemasukan', 'bendahara_pengeluaran', 'teacher'] },
];

const bottomNavItems = [
  { icon: 'settings', label: 'Pengaturan', path: '/settings' },
  { icon: 'help', label: 'Bantuan', path: '/support' },
];

export default function Sidebar() {
  const { user } = useAuth();
  
  const linkClasses = (isActive) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 active:scale-95 ${
      isActive
        ? 'bg-secondary-container text-on-secondary-container font-tabular-nums text-tabular-nums font-bold'
        : 'text-on-surface-variant hover:bg-surface-container-high'
    }`;

  const filteredNavItems = mainNavItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <aside
      id="sidebar"
      className="bg-surface-container-lowest w-[280px] h-full fixed left-0 top-0 border-r border-outline-variant shadow-sm flex flex-col py-container-padding z-50"
    >
      {/* Logo & Brand */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary m-0">Sibajra Pay</h1>
          <p className="font-label-md text-label-md text-on-surface-variant m-0 uppercase tracking-wider">
            {user?.role === 'teacher' ? 'Portal Wali Kelas' : 'Portal Admin'}
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => linkClasses(isActive)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 mt-auto flex flex-col gap-1 pt-4 border-t border-outline-variant/50">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => linkClasses(isActive)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
