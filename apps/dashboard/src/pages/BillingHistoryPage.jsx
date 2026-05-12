import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);
};

export default function BillingHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get('studentId');

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [page, perPage, studentId, startDate, endDate]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions({ 
        page, 
        perPage, 
        studentId,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilter = () => {
    setSearchParams({});
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.transactionCode.toLowerCase().includes(search.toLowerCase()) ||
    tx.student?.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const viewReceipt = (id) => {
    window.open(`/receipt/${id}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-display text-on-surface m-0">
            {studentId && transactions.length > 0 
              ? `Riwayat Pembayaran: ${transactions[0].student?.fullName}` 
              : 'Riwayat Pembayaran'}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1 m-0">
            {studentId 
              ? `Menampilkan histori transaksi untuk ${transactions[0]?.student?.fullName || 'siswa terpilih'}.`
              : 'Daftar transaksi pembayaran siswa yang telah diproses.'}
          </p>
        </div>
        {studentId && (
          <button 
            onClick={clearFilter}
            className="bg-surface border border-outline-variant px-4 py-2 rounded-lg font-label-lg text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            Tampilkan Semua Siswa
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-outline-variant flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-secondary transition-colors"
                  placeholder="Cari kode transaksi atau nama siswa..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 bg-surface border border-outline-variant rounded-lg px-3 py-1.5">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_today</span>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none font-body-md text-on-surface cursor-pointer"
                  title="Tanggal Mulai"
                />
                <span className="text-on-surface-variant px-1">s/d</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none font-body-md text-on-surface cursor-pointer"
                  title="Tanggal Akhir"
                />
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="ml-2 p-1 hover:bg-surface-container rounded-full text-error"
                    title="Reset Tanggal"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="font-label-sm text-on-surface-variant whitespace-nowrap">Show:</label>
                <select 
                  className="px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary cursor-pointer"
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button 
                onClick={fetchTransactions}
                className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
                title="Refresh"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Container with Scroll */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-container shadow-sm">
              <tr className="bg-surface-container">
                <th className="text-left p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Kode TRX</th>
                <th className="text-left p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Tanggal</th>
                <th className="text-left p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Siswa</th>
                <th className="text-left p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Metode</th>
                <th className="text-right p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Total</th>
                <th className="text-center p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-secondary text-4xl">progress_activity</span>
                      <p className="font-body-md text-on-surface-variant">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <span className="material-symbols-outlined text-outline text-5xl mb-2 block">history</span>
                    <p className="font-body-lg text-on-surface-variant">Tidak ada riwayat pembayaran.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="p-4 border-b border-outline-variant font-tabular-nums text-tabular-nums font-bold text-primary">
                      {tx.transactionCode}
                    </td>
                    <td className="p-4 border-b border-outline-variant font-body-md text-on-surface">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4 border-b border-outline-variant">
                      <div className="flex flex-col">
                        <span className="font-body-md text-on-surface font-medium">{tx.student?.fullName}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tx.items?.map((item, idx) => {
                            const b = item.billingItem;
                            const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const label = b?.feeTemplate?.name || 'Item';
                            const period = b?.billingMonth ? `${monthNames[b.billingMonth]} ${b.billingYear}` : b?.billingYear || '';
                            return (
                              <span key={idx} className="font-label-sm px-1.5 py-0.5 bg-secondary-container text-on-secondary-container rounded border border-secondary/20 whitespace-nowrap">
                                {label} {period}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 border-b border-outline-variant">
                      <span className={`px-2 py-1 rounded-md font-label-md capitalize ${
                        tx.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                        tx.paymentMethod === 'qris' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 border-b border-outline-variant text-right font-tabular-nums text-tabular-nums font-bold">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="p-4 border-b border-outline-variant text-center">
                      <button
                        onClick={() => viewReceipt(tx.id)}
                        className="p-2 hover:bg-secondary-container text-secondary rounded-lg transition-all active:scale-95 flex items-center justify-center mx-auto"
                        title="Cetak Kwitansi"
                      >
                        <span className="material-symbols-outlined">print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-surface-container flex items-center justify-between">
          <span className="font-label-md text-on-surface-variant">
            Menampilkan {filteredTransactions.length} transaksi
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage(p => p - 1)}
              className="p-2 hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="font-label-lg px-4 py-2 bg-surface rounded-lg border border-outline-variant">
              {page}
            </span>
            <button
              disabled={transactions.length < perPage || loading}
              onClick={() => setPage(p => p + 1)}
              className="p-2 hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
