import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = ['Operasional', 'Gaji', 'Sarana & Prasarana', 'Kegiatan', 'Lain-lain'];

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.getExpenses({});
      setExpenses(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createExpense({
        ...formData,
        amount: Number(formData.amount)
      });
      setShowAddModal(false);
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchExpenses();
    } catch (err) {
      alert('Gagal menyimpan pengeluaran: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      await api.deleteExpense(id);
      fetchExpenses();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-display text-on-surface m-0">Pengeluaran Kas</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1 m-0">
            Catat dan pantau seluruh transaksi pengeluaran operasional sekolah.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-label-lg hover:shadow-lg transition-all flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Tambah Pengeluaran
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="sticky top-0 z-10 bg-surface-container">
                <th className="p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Tanggal</th>
                <th className="p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Kategori</th>
                <th className="p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Keterangan</th>
                <th className="p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Nominal</th>
                <th className="p-4 font-label-lg text-on-surface-variant border-b border-outline-variant text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-12 text-center text-on-surface-variant">Memuat data...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan="5" className="p-12 text-center text-on-surface-variant">Belum ada data pengeluaran.</td></tr>
              ) : expenses.map(ex => (
                <tr key={ex.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 border-b border-outline-variant font-body-md text-on-surface">
                    {new Date(ex.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4 border-b border-outline-variant">
                    <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded-md font-label-sm">
                      {ex.category}
                    </span>
                  </td>
                  <td className="p-4 border-b border-outline-variant font-body-md text-on-surface-variant">
                    {ex.description}
                  </td>
                  <td className="p-4 border-b border-outline-variant font-tabular-nums text-on-surface font-bold">
                    {formatRupiah(ex.amount)}
                  </td>
                  <td className="p-4 border-b border-outline-variant text-right">
                    <button 
                      onClick={() => handleDelete(ex.id)}
                      className="p-2 text-error hover:bg-error/10 rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-outline-variant">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline-sm text-headline-sm m-0">Tambah Pengeluaran</h3>
              <button onClick={() => setShowAddModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant">Tanggal</label>
                <input 
                  type="date"
                  required
                  className="bg-surface border border-outline-variant rounded-lg p-3 font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant">Kategori</label>
                <select 
                  required
                  className="bg-surface border border-outline-variant rounded-lg p-3 font-body-md focus:border-primary outline-none"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant">Nominal</label>
                <input 
                  type="number"
                  required
                  placeholder="Contoh: 500000"
                  className="bg-surface border border-outline-variant rounded-lg p-3 font-body-md focus:border-primary outline-none"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant">Keterangan</label>
                <textarea 
                  rows="3"
                  className="bg-surface border border-outline-variant rounded-lg p-3 font-body-md focus:border-primary outline-none resize-none"
                  placeholder="Detail penggunaan dana..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                className="bg-primary text-on-primary py-4 rounded-xl font-headline-sm mt-2 hover:shadow-md transition-all active:scale-[0.98]"
              >
                Simpan Transaksi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
