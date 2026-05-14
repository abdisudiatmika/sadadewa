export default function ArrearsTable({ data = [] }) {
  return (
    <div
      id="arrears-table"
      className="lg:col-span-1 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-[400px]"
    >
      {/* Header */}
      <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
        <h3 className="font-headline-md text-headline-md text-primary m-0">Tunggakan Terbesar</h3>
        <button
          id="btn-view-all-arrears"
          className="text-secondary hover:text-[#0f766e] font-tabular-nums text-tabular-nums transition-colors"
        >
          Lihat Semua
        </button>
      </div>

      {/* Table */}
      <div className="overflow-y-auto flex-1">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-on-surface-variant">
            <p className="font-body-md">Tidak ada data tunggakan</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider z-10 border-b border-outline-variant">
              <tr>
                <th className="px-5 py-3 font-medium">Siswa</th>
                <th className="px-5 py-3 font-medium text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-md text-body-md text-on-surface">
              {data.map((student, index) => (
                <tr
                  key={student.studentId}
                  className={`hover:bg-surface-container-low transition-colors group cursor-pointer ${
                    index % 2 !== 0 ? 'bg-surface-container-lowest' : ''
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="font-medium text-primary group-hover:text-secondary transition-colors">
                      {student.studentName}
                    </div>
                    <div className="text-label-md text-on-surface-variant">
                      {student.className} • {student.monthsOverdue} bulan
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-tabular-nums font-medium text-error">
                    {Number(student.totalArrears).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
