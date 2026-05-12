import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import StatCards from '../components/StatCards';
import RevenueChart from '../components/RevenueChart';
import ArrearsTable from '../components/ArrearsTable';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [arrears, setArrears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardStats(),
      api.getTopArrears(),
    ])
      .then(([statsRes, arrearsRes]) => {
        setStats(statsRes.data);
        setArrears(arrearsRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined text-secondary text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary m-0">Overview</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Real-time summary of institutional finances.
          </p>
        </div>
        <div className="text-label-md font-label-md text-on-surface-variant">
          Last updated: Just now
        </div>
      </div>

      {/* Stat Cards */}
      <StatCards stats={stats} />

      {/* Chart + Arrears Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-card-gap mt-4">
        <RevenueChart />
        <ArrearsTable data={arrears} />
      </div>
    </>
  );
}
