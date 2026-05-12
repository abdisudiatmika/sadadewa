const chartData = [
  { month: 'Aug', height: '40%', active: false },
  { month: 'Sep', height: '55%', active: false },
  { month: 'Oct', height: '45%', active: false },
  { month: 'Nov', height: '75%', active: true },
  { month: 'Dec', height: '60%', active: false },
  { month: 'Jan', height: '85%', active: false },
];

export default function RevenueChart() {
  return (
    <div
      id="revenue-chart"
      className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0_2px_4px_rgba(0,0,0,0.04)] p-6 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-headline-md text-headline-md text-primary">6-Month Revenue Trends</h3>
        <button
          id="btn-chart-filter"
          className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-label-md text-label-md border border-outline-variant px-3 py-1.5 rounded-md"
        >
          Filter
          <span className="material-symbols-outlined text-[18px]">filter_list</span>
        </button>
      </div>

      {/* Bar Chart */}
      <div className="flex-1 flex items-end justify-between gap-4 h-[240px] mt-auto border-b border-outline-variant/50 pb-2 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-label-md font-label-md text-on-surface-variant/60 -ml-2 text-right">
          <span>150M</span>
          <span>100M</span>
          <span>50M</span>
          <span>0</span>
        </div>

        {/* Bars */}
        <div className="pl-8 flex-1 flex items-end justify-around h-full">
          {chartData.map((bar) => (
            <div key={bar.month} className="flex flex-col items-center gap-2 group">
              <div
                className={`w-12 rounded-t-sm transition-colors ${
                  bar.active
                    ? 'bg-[#0D9488] shadow-[0_4px_12px_rgba(13,148,136,0.3)]'
                    : 'bg-surface-container-highest group-hover:bg-secondary-container'
                }`}
                style={{ height: bar.height }}
              />
              <span
                className={`text-label-md font-label-md ${
                  bar.active ? 'text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                {bar.month}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
