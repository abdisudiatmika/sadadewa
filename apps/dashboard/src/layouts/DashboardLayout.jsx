import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';

export default function DashboardLayout() {
  const location = useLocation();
  const isPos = location.pathname === '/pos';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-[280px] h-screen">
        <TopNav />
        <main className={`flex-1 flex flex-col ${isPos ? 'overflow-hidden bg-background' : 'p-container-padding gap-card-gap overflow-y-auto'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
