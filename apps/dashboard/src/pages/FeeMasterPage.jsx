import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';

function formatRupiah(value) {
  const num = Number(value || 0);
  return `Rp ${num.toLocaleString('id-ID')}`;
}

const categoryLabels = { recurring: 'Rutin', one_time: 'Sekali Bayar' };
const frequencyLabels = { monthly: 'Bulanan', yearly: 'Tahunan', once: 'Sekali' };

export default function FeeMasterPage() {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', amount: '', category: 'recurring', frequency: 'monthly' });
  const [saving, setSaving] = useState(false);
  
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatingFee, setGeneratingFee] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [classesList, setClassesList] = useState([]);
  const [uploadingArrears, setUploadingArrears] = useState(false);

  const openModal = (fee = null) => {
    setEditingFee(fee);
    setForm(fee ? { ...fee } : { code: '', name: '', amount: '', category: 'recurring', frequency: 'monthly' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editingFee) {
        await api.updateFee(editingFee.id, payload);
      } else {
        await api.createFee(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feesRes, summaryRes, classesRes] = await Promise.all([
        api.getFees({ search: search || undefined }),
        api.getFeeSummary(),
        api.getClasses().catch(() => ({ data: [] }))
      ]);
      setFees(feesRes.data || []);
      setSummary(summaryRes.data);
      setClassesList(classesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.generateBillsFee(generatingFee.id, { classId: selectedClassId || undefined });
      alert(`Berhasil menerbitkan ${res.data.generated} tagihan baru!`);
      setShowGenerateModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || '';
      const link = document.createElement('a');
      link.href = `${API_BASE}/api/billing/template-arrears`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download template', err);
    }
  };

  const handleArrearsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingArrears(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (jsonData.length === 0) {
        throw new Error("File Excel kosong atau tidak valid.");
      }

      const records = jsonData.map(row => {
        return {
          nisn: String(row.nisn || row.NISN || "").trim(),
          billName: String(row.namaTagihan || row['Nama Tagihan'] || "Tunggakan Lama").trim(),
          amount: Number(row.nominal || row.Nominal || 0)
        };
      }).filter(r => r.nisn && r.amount > 0);

      if (records.length === 0) {
        throw new Error("Tidak menemukan data tunggakan valid untuk diunggah.");
      }

      const res = await api.bulkUploadArrears(records);
      alert(`Berhasil mengunggah dan membuat tagihan untuk ${res.data.imported} data tunggakan!`);
      fetchData();
    } catch (error) {
      alert("Gagal mengunggah file tunggakan: " + error.message);
    } finally {
      setUploadingArrears(false);
      e.target.value = ''; // reset file input
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const timer = setTimeout(fetchData, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <>
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8 mt-2">
        <div>
          <h1 className="font-display text-display text-primary mb-2 m-0">Master Biaya</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant m-0">Kelola dan definisikan seluruh struktur biaya sekolah.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative focus-within:ring-2 focus-within:ring-secondary rounded-lg">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:border-secondary w-[250px] shadow-sm"
              placeholder="Cari nama biaya..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex bg-secondary-container text-on-secondary-container rounded-lg border border-secondary/20 overflow-hidden shadow-sm">
            <button 
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 hover:bg-on-secondary-container/10 transition-colors flex items-center gap-2 font-label-lg"
              title="Download Template Excel"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              Template
            </button>
            <div className="w-[1px] bg-secondary/20"></div>
            <label className={`px-4 py-2.5 font-label-lg hover:bg-on-secondary-container/10 transition-colors cursor-pointer flex items-center gap-2 ${uploadingArrears ? 'opacity-50 pointer-events-none' : ''}`}>
              <span className={`material-symbols-outlined text-[20px] ${uploadingArrears ? 'animate-spin' : ''}`}>
                {uploadingArrears ? 'progress_activity' : 'upload_file'}
              </span>
              {uploadingArrears ? 'Memproses...' : 'Upload Tunggakan'}
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleArrearsUpload} disabled={uploadingArrears} />
            </label>
          </div>
          
          <button onClick={() => openModal()} className="font-body-md text-body-md bg-[#0D9488] text-white px-5 py-2.5 rounded-lg hover:bg-[#0F766E] transition-colors duration-200 flex items-center gap-2 shadow-sm font-medium">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Tambah Biaya Baru
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-card-gap mb-8">
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-6xl text-secondary">payments</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2 m-0">Total Biaya Aktif</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-3xl text-primary font-bold m-0">{summary?.activeFees ?? '-'}</h3>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-6xl text-[#0D9488]">trending_up</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2 m-0">Est. Pendapatan Rutin</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-2xl text-primary font-bold tracking-tight m-0">{formatRupiah(summary?.estimatedMonthlyRevenue)}</h3>
            <span className="font-body-md text-body-md text-on-surface-variant text-xs">/ bulan</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-6xl text-primary-container">event</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2 m-0">Biaya Sekali Bayar</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-3xl text-primary font-bold m-0">{summary?.oneTimeFees ?? '-'}</h3>
          </div>
        </div>
      </div>

      {/* Fee Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined text-secondary text-4xl animate-spin">progress_activity</span>
        </div>
      ) : fees.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant font-body-md">
          No fee templates found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-card-gap">
          {fees.map((fee) => (
            <div key={fee.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              {/* Card Header */}
              <div className="p-5 pb-3 flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    fee.category === 'recurring'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-primary-fixed text-on-primary-fixed'
                  }`}>
                    <span className="material-symbols-outlined">
                      {fee.category === 'recurring' ? 'calendar_month' : 'receipt_long'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-headline-md text-on-surface m-0 leading-tight">{fee.name}</h4>
                    <p className="font-label-md text-label-md text-on-surface-variant mt-1 m-0">
                      Code: {fee.code}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                  fee.status === 'active'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-variant text-on-surface-variant'
                }`}>
                  {fee.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Card Body */}
              <div className="px-5 pb-3">
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="font-display text-2xl text-primary font-bold font-tabular-nums tracking-tight">
                    {formatRupiah(fee.amount)}
                  </span>
                  <span className="text-on-surface-variant text-xs">
                    / {frequencyLabels[fee.frequency] || fee.frequency}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-surface-container px-2 py-1 rounded text-[11px] text-on-surface-variant">
                    {categoryLabels[fee.category] || fee.category}
                  </span>
                  {fee.targetDescription && (
                    <span className="bg-surface-container px-2 py-1 rounded text-[11px] text-on-surface-variant">
                      {fee.targetDescription}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-5 py-3 border-t border-outline-variant flex justify-between">
                <button onClick={() => openModal(fee)} className="text-secondary hover:underline font-label-md text-label-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                </button>
                <button
                  className="text-[#0D9488] hover:text-[#0F766E] font-label-md text-label-md flex items-center gap-1 font-bold"
                  onClick={() => {
                    setGeneratingFee(fee);
                    setSelectedClassId('');
                    setShowGenerateModal(true);
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">send</span> Terbitkan Tagihan
                </button>
                <div className="flex items-center gap-3">
                  <button
                    className="text-on-surface-variant hover:text-secondary"
                    onClick={() => {
                      api.duplicateFee(fee.id).then(() => fetchData()).catch(err => alert(err.message));
                    }}
                    title="Duplicate"
                  >
                    <span className="material-symbols-outlined text-[20px]">content_copy</span>
                  </button>
                  <button
                    className="text-on-surface-variant hover:text-error"
                    onClick={() => {
                      if (confirm('Hapus master biaya ini?')) {
                        api.deleteFee(fee.id).then(() => fetchData()).catch(err => alert(err.message));
                      }
                    }}
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h2 className="font-headline-sm text-headline-sm text-on-surface m-0">
                {editingFee ? 'Edit Biaya' : 'Tambah Biaya Baru'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-on-surface-variant mb-1">Kode Biaya</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-secondary"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. SPP-10"
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-on-surface-variant mb-1">Jumlah (Rp)</label>
                    <input
                      required
                      type="number"
                      className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-secondary"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="e.g. 250000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">Nama Biaya</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-secondary"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. SPP Bulanan Kelas 10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-on-surface-variant mb-1">Kategori</label>
                    <select
                      className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-secondary"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="recurring">Rutin</option>
                      <option value="one_time">Sekali Bayar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-md text-on-surface-variant mb-1">Frekuensi</label>
                    <select
                      className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-secondary"
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    >
                      <option value="monthly">Bulanan</option>
                      <option value="yearly">Tahunan</option>
                      <option value="once">Sekali</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg font-label-lg font-medium text-on-surface hover:bg-surface-container transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-label-lg font-medium bg-primary text-on-primary hover:bg-on-background transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {saving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Terbitkan Tagihan */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h2 className="font-headline-sm text-headline-sm text-on-surface m-0">
                Terbitkan Tagihan
              </h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleGenerate} className="p-6">
              <p className="font-body-md text-on-surface-variant mb-4 m-0">
                Terbitkan tagihan <strong>{generatingFee?.name}</strong>. Anda dapat memilih untuk menagihkannya ke semua siswa aktif atau hanya untuk kelas tertentu.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">Pilih Kelas Target</label>
                  <select
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-secondary"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    <option value="">Semua Kelas (Global)</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.grade?.name} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-lg font-label-lg font-medium text-on-surface hover:bg-surface-container transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-4 py-2 rounded-lg font-label-lg font-medium bg-[#0D9488] text-white hover:bg-[#0F766E] transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {generating && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
