function formatRupiah(value) {
  if (!value && value !== 0) return '0';
  const num = Number(value);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toLocaleString('id-ID');
}

export default function StatCards({ stats }) {
  const cards = [
    {
      id: 'stat-active-students',
      icon: 'group',
      iconFill: false,
      label: 'Total Active Students',
      value: stats?.totalActiveStudents?.toLocaleString() || '0',
      change: 'Current term',
      changeIcon: 'arrow_upward',
      changeColor: 'text-secondary',
      iconBg: 'bg-surface-container',
      iconColor: 'text-primary',
      highlight: false,
    },
    {
      id: 'stat-total-arrears',
      icon: 'account_balance_wallet',
      iconFill: true,
      label: 'Total Arrears (Rp)',
      value: formatRupiah(stats?.totalArrears),
      change: 'Requires attention',
      changeIcon: 'warning',
      changeColor: 'text-error',
      iconBg: 'bg-error-container',
      iconColor: 'text-error',
      highlight: false,
    },
    {
      id: 'stat-unpaid',
      icon: 'person_off',
      iconFill: false,
      label: 'Unpaid This Month',
      value: String(stats?.unpaidThisMonth || 0),
      change: 'of active students',
      changeIcon: null,
      changeColor: 'text-on-surface-variant',
      iconBg: 'bg-surface-container',
      iconColor: 'text-error',
      highlight: false,
    },
    {
      id: 'stat-monthly-revenue',
      icon: 'trending_up',
      iconFill: false,
      label: 'Total Monthly Revenue',
      value: formatRupiah(stats?.monthlyRevenue),
      change: 'This month',
      changeIcon: 'arrow_upward',
      changeColor: 'text-secondary',
      iconBg: 'bg-secondary-container',
      iconColor: 'text-on-secondary-container',
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap">
      {cards.map((stat) => (
        <div
          key={stat.id}
          id={stat.id}
          className={`bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-[0_2px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow ${
            stat.highlight ? 'relative overflow-hidden' : ''
          }`}
        >
          {stat.highlight && (
            <div className="absolute inset-0 bg-gradient-to-br from-secondary-container/20 to-transparent pointer-events-none" />
          )}

          <div className={`flex items-center gap-3 mb-4 ${stat.highlight ? 'relative z-10' : ''}`}>
            <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center ${stat.iconColor}`}>
              <span className={`material-symbols-outlined ${stat.iconFill ? 'icon-fill' : ''}`}>
                {stat.icon}
              </span>
            </div>
            <h3 className="font-body-md text-body-md text-on-surface-variant font-medium">
              {stat.label}
            </h3>
          </div>

          <div className={`font-display text-display text-primary ${stat.highlight ? 'relative z-10' : ''}`}>
            {stat.value}
          </div>

          <div
            className={`mt-2 text-label-md font-label-md ${stat.changeColor} flex items-center gap-1 ${
              stat.highlight ? 'relative z-10' : ''
            }`}
          >
            {stat.changeIcon && (
              <span className="material-symbols-outlined text-[16px]">{stat.changeIcon}</span>
            )}
            {stat.change}
          </div>
        </div>
      ))}
    </div>
  );
}
