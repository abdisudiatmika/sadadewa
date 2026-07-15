import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import Skeleton from '../components/ui/Skeleton';

export default function DiscountMasterPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    code: '',
    description: '',
    type: 'percentage', // or 'fixed_amount'
    value: '',
    maxUses: '',
    validFrom: '',
    validUntil: '',
    isActive: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getDiscounts({ search });
      setDiscounts(res.data);
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil data diskon');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      code: '',
      description: '',
      type: 'percentage',
      value: '',
      maxUses: '',
      validFrom: '',
      validUntil: '',
      isActive: true
    });
    setShowModal(true);
  };

  const openEditModal = (discount) => {
    setEditingId(discount.id);
    setForm({
      code: discount.code,
      description: discount.description || '',
      type: discount.type,
      value: discount.value,
      maxUses: discount.maxUses || '',
      validFrom: discount.validFrom ? discount.validFrom.split('T')[0] : '',
      validUntil: discount.validUntil ? discount.validUntil.split('T')[0] : '',
      isActive: discount.isActive
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase().replace(/\s/g, ''),
        value: Number(form.value),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
      };

      if (editingId) {
        await api.updateDiscount(editingId, payload);
      } else {
        await api.createDiscount(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async (id, code) => {
    if (window.confirm(`Hapus kode diskon ${code}?`)) {
      try {
        await api.deleteDiscount(id);
        fetchData();
      } catch (err) {
        alert(err.message || 'Gagal menghapus diskon');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Master Diskon / Potongan</h1>
          <p className="text-on-surface-variant">Kelola kode diskon, beasiswa, dan sumbangan</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              placeholder="Cari kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-64 bg-surface-container-highest rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <span className="material-symbols-rounded text-[20px]">add</span>
            Tambah Kode
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Kode</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Potongan</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Terpakai</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Masa Berlaku</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Status</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-32" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-16" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-40" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-8 w-20 rounded-full" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></td>
                  </tr>
                ))
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-on-surface-variant">
                    Tidak ada kode diskon ditemukan
                  </td>
                </tr>
              ) : (
                discounts.map(d => (
                  <tr key={d.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold font-mono text-primary bg-primary-container/20 px-2 py-1 rounded inline-block">
                        {d.code}
                      </div>
                      <div className="text-sm text-on-surface-variant mt-1">{d.description}</div>
                    </td>
                    <td className="py-4 px-6 font-bold">
                      {d.type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <span className="font-bold">{d.usedCount}</span>
                        {d.maxUses ? ` / ${d.maxUses}` : ' (Tanpa batas)'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        {d.validFrom ? new Date(d.validFrom).toLocaleDateString('id-ID') : 'Selamanya'} 
                        {' - '} 
                        {d.validUntil ? new Date(d.validUntil).toLocaleDateString('id-ID') : 'Selamanya'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        d.isActive ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'
                      }`}>
                        {d.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => openEditModal(d)}
                        className="p-2 text-primary hover:bg-primary-container/50 rounded-full transition-colors mr-2"
                        title="Edit"
                      >
                        <span className="material-symbols-rounded text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(d.id, d.code)}
                        className="p-2 text-error hover:bg-error-container/50 rounded-full transition-colors"
                        title="Hapus"
                      >
                        <span className="material-symbols-rounded text-[20px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <h2 className="text-xl font-bold text-on-surface">{editingId ? 'Edit Kode Diskon' : 'Tambah Kode Diskon'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-label-md text-on-surface-variant">Kode Unik</label>
            <input
              type="text"
              required
              placeholder="Contoh: JUARA1, BEASISWA100"
              value={form.code}
              onChange={e => setForm({...form, code: e.target.value.toUpperCase().replace(/\s/g, '')})}
              className="mt-1 w-full px-4 py-2 bg-surface-container-lowest border border-outline rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono uppercase"
            />
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant">Keterangan / Deskripsi</label>
            <input
              type="text"
              placeholder="Contoh: Beasiswa Juara 1 Nasional"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              className="mt-1 w-full px-4 py-2 bg-surface-container-lowest border border-outline rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant">Jenis Potongan</label>
              <select
                required
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="mt-1 w-full px-4 py-2 bg-surface-container-lowest border border-outline rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="fixed_amount">Nominal Tetap (Rp)</option>
              </select>
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant">Nilai Potongan</label>
              <input
                type="number"
                required
                min="1"
                max={form.type === 'percentage' ? 100 : undefined}
                placeholder={form.type === 'percentage' ? '100' : '500000'}
                value={form.value}
                onChange={e => setForm({...form, value: e.target.value})}
                className="mt-1 w-full px-4 py-2 bg-surface-container-lowest border border-outline rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant">Batas Penggunaan (Opsional)</label>
            <input
              type="number"
              min="1"
              placeholder="Kosongkan jika tanpa batas (Unlimited)"
              value={form.maxUses}
              onChange={e => setForm({...form, maxUses: e.target.value})}
              className="mt-1 w-full px-4 py-2 bg-surface-container-lowest border border-outline rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant">Berlaku Mulai (Opsional)</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={e => setForm({...form, validFrom: e.target.value})}
                className="mt-1 w-full px-4 py-2 bg-surface-container-lowest border border-outline rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant">Berlaku Sampai (Opsional)</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={e => setForm({...form, validUntil: e.target.value})}
                className="mt-1 w-full px-4 py-2 bg-surface-container-lowest border border-outline rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={e => setForm({...form, isActive: e.target.checked})}
              className="w-5 h-5 rounded border-outline text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="font-label-lg text-on-surface">Status Aktif</label>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-6 py-2.5 rounded-full font-label-lg text-primary hover:bg-primary/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full font-label-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors"
            >
              Simpan Diskon
            </button>
          </div>
        </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
