import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

export default function ReportsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isTeacher = role === 'teacher';
  const isSuperadmin = role === 'superadmin' || role === 'admin';
  const isPemasukan = role === 'bendahara_pemasukan';
  const isPengeluaran = role === 'bendahara_pengeluaran';

  const getDefaultCategory = () => {
    if (isTeacher) return 'summary';
    if (isPengeluaran) return 'cashflow';
    return 'cashflow';
  };

  const getDefaultTab = () => {
    if (isTeacher) return 'class_summary';
    if (isPengeluaran) return 'expenses';
    return 'income_daily';
  };

  const [category, setCategory] = useState(getDefaultCategory());
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [showScroll, setShowScroll] = useState(false);
  
  // Search states for student ledger
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeTemplates, setFeeTemplates] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Active Filters
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    paymentMethod: '',
    gradeId: '',
    classId: '', // For teacher, this should be their managed class ID
    feeTemplateId: '',
    studentId: '',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const reportCategories = [];
  if (isSuperadmin || isPemasukan || isPengeluaran) {
    reportCategories.push({ id: 'cashflow', label: 'Pemasukan & Pengeluaran', icon: 'account_balance_wallet' });
  }
  if (isSuperadmin || isPemasukan || isTeacher) {
    reportCategories.push({ id: 'summary', label: 'Tunggakan & Rekapitulasi', icon: 'summarize' });
  }

  const allTabs = {
    cashflow: [
      ...(isSuperadmin || isPemasukan ? [
        { id: 'income_daily', label: 'Pemasukan Harian', icon: 'calendar_today' },
        { id: 'income_monthly', label: 'Pemasukan Bulanan', icon: 'calendar_month' },
      ] : []),
      ...(isSuperadmin || isPengeluaran ? [
        { id: 'expenses', label: 'Laporan Pengeluaran', icon: 'payments' },
      ] : []),
    ],
    summary: [
      { id: 'delinquency', label: 'Laporan Tunggakan', icon: 'warning' },
      { id: 'student_ledger', label: 'Rekap per Siswa', icon: 'person_search' },
      { id: 'class_summary', label: 'Rekap per Kelas', icon: 'group' },
    ]
  };

  const tabs = allTabs[category] || [];

  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  useEffect(() => {
    const handleScroll = () => {
      const main = document.querySelector('main');
      if (main) setShowScroll(main.scrollTop > 300);
    };
    const main = document.querySelector('main');
    if (main) main.addEventListener('scroll', handleScroll);
    return () => main?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const main = document.querySelector('main');
    main?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Load filter options
    const loadOptions = async () => {
      try {
        const [gRes, cRes, fRes, sRes] = await Promise.all([
          api.getGrades().catch(() => ({ data: [] })),
          api.getClasses().catch(() => ({ data: [] })),
          api.getFees ? api.getFees().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          api.getStudents ? api.getStudents({ perPage: 1000 }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
        ]);
        
        setGrades(gRes.data || []);
        setClasses(cRes.data || []);
        setFeeTemplates(fRes.data || []);
        // Handle both standardized {data: []} and spread {students: []} responses
        setStudents(sRes.students || sRes.data?.students || sRes.data || []);
      } catch (err) {
        console.error("Error loading filters:", err);
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    // Clear search states when tab changes
    setStudentSearchQuery('');
    setSearchResults([]);
    
    const fetchReport = async () => {
      setLoading(true);
      try {
        let res = { data: null };
        if (activeTab === 'income_daily') {
          res = await api.getDailyIncomeReport(filters.date);
        } else if (activeTab === 'income_monthly') {
          res = await api.getMonthlyIncomeReport(filters.month, filters.year, filters.paymentMethod);
        } else if (activeTab === 'expenses') {
          res = await api.getExpenses({ startDate: filters.startDate, endDate: filters.endDate });
        } else if (activeTab === 'delinquency') {
          res = await api.getDetailedDelinquencyReport({
            classId: filters.classId,
            gradeId: filters.gradeId,
            feeTemplateId: filters.feeTemplateId
          });
        } else if (activeTab === 'student_ledger') {
          if (filters.studentId) res = await api.getStudentLedger(filters.studentId);
        } else if (activeTab === 'class_summary') {
          if (filters.classId) res = await api.getClassSummaryReport(filters.classId);
        }
        setData(res?.data || []);
      } catch (err) {
        console.error("Error fetching report:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [activeTab, filters.date, filters.month, filters.year, filters.paymentMethod, filters.gradeId, filters.classId, filters.feeTemplateId, filters.studentId, filters.startDate, filters.endDate]);

  const handleStudentSearch = async (q) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.searchStudents(q);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStudent = (student) => {
    setFilters({ ...filters, studentId: student.id });
    setStudentSearchQuery(student.fullName);
    setSearchResults([]);
  };

  const exportExcel = () => {
    if (!data) return;
    
    let exportData = [];
    let fileName = `Laporan_${activeTab}_${new Date().getTime()}`;

    if (activeTab === 'income_daily' || activeTab === 'income_monthly') {
      exportData = data.map(tx => ({
        'Kode TRX': tx.transactionCode,
        'Tanggal': new Date(tx.createdAt).toLocaleString(),
        'Siswa': tx.student?.fullName,
        'Item': tx.items?.map(i => i.billingItem?.feeTemplate?.name).join(', '),
        'Metode': tx.paymentMethod,
        'Total': tx.total
      }));
    } else if (activeTab === 'delinquency') {
      exportData = data.map(it => ({
        'NISN': it.student?.nisn,
        'Nama Siswa': it.student?.fullName,
        'Kelas': `${it.student?.class?.grade?.name} ${it.student?.class?.name}`,
        'Item Tagihan': it.feeTemplate?.name,
        'Periode': `${monthNames[it.billingMonth]} ${it.billingYear}`,
        'Nominal': it.amount
      }));
    } else if (activeTab === 'student_ledger' && data?.billingItems) {
      exportData = data.billingItems.map(it => ({
        'Item': it.feeTemplate?.name,
        'Periode': `${monthNames[it.billingMonth]} ${it.billingYear}`,
        'Nominal': it.amount,
        'Status': it.status,
        'Tanggal Bayar': it.paidAt ? new Date(it.paidAt).toLocaleDateString() : '-'
      }));
    } else if (activeTab === 'expenses') {
      exportData = data.map(exp => ({
        'Tanggal': new Date(exp.date).toLocaleDateString(),
        'Kategori': exp.category,
        'Keterangan': exp.description,
        'Nominal': exp.amount
      }));
    } else if (activeTab === 'class_summary' && data?.stats) {
      exportData = data.stats.map(s => {
        const student = data.class.students.find(st => st.id === s.studentId);
        return {
          'NISN': student?.nisn,
          'Nama Siswa': student?.fullName,
          'Total Tagihan': s.totalBilled,
          'Total Dibayar': s.totalPaid,
          'Total Tunggakan': s.totalOutstanding
        };
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="font-display text-display text-on-surface m-0">Laporan Keuangan</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1 m-0">
            Pusat kendali laporan pemasukan, tunggakan, dan rekapitulasi data keuangan.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="bg-surface border border-outline-variant px-4 py-2 rounded-lg font-label-lg hover:bg-surface-container transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            Cetak PDF
          </button>
          <button 
            onClick={exportExcel}
            className="bg-secondary text-on-secondary px-6 py-2 rounded-xl font-label-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">table_view</span>
            Export Excel
          </button>
        </div>
      </div>

      {/* Main Category Selector */}
      <div className="grid grid-cols-2 gap-4">
        {reportCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setCategory(cat.id);
              setActiveTab(allTabs[cat.id][0].id);
            }}
            className={`flex items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${
              category === cat.id 
                ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                : 'border-outline-variant bg-surface text-on-surface-variant hover:border-primary/50'
            }`}
          >
            <span className="material-symbols-outlined text-[32px]">{cat.icon}</span>
            <div className="text-left">
              <p className="font-label-sm uppercase tracking-wider m-0 opacity-70">Kategori Laporan</p>
              <p className="font-display text-xl m-0">{cat.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-outline-variant gap-1 overflow-x-auto pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-primary text-primary font-bold bg-primary/10' 
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            <span className="font-label-lg">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Filters Container */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-wrap gap-6 items-end">
        {activeTab === 'income_daily' && (
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-on-surface-variant">Pilih Tanggal</label>
            <input 
              type="date"
              className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md"
              value={filters.date}
              onChange={e => setFilters({...filters, date: e.target.value})}
            />
          </div>
        )}

        {activeTab === 'income_monthly' && (
          <>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Bulan</label>
              <select 
                className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md pr-8"
                value={filters.month}
                onChange={e => setFilters({...filters, month: Number(e.target.value)})}
              >
                {monthNames.map((m, i) => i > 0 && <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Tahun</label>
              <select 
                className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md"
                value={filters.year}
                onChange={e => setFilters({...filters, year: Number(e.target.value)})}
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {activeTab === 'expenses' && (
          <>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Dari Tanggal</label>
              <input 
                type="date"
                className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md"
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Sampai Tanggal</label>
              <input 
                type="date"
                className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md"
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
          </>
        )}
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Metode</label>
              <select 
                className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md pr-8"
                value={filters.paymentMethod}
                onChange={e => setFilters({...filters, paymentMethod: e.target.value})}
              >
                <option value="">Semua Metode</option>
                <option value="cash">Tunai (Cash)</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </>
        )}

        {activeTab === 'delinquency' && (
          <>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Komponen Biaya</label>
              <select 
                className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md pr-8 max-w-[200px]"
                value={filters.feeTemplateId}
                onChange={e => setFilters({...filters, feeTemplateId: e.target.value})}
              >
                <option value="">Semua Biaya</option>
                {feeTemplates.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Tingkat</label>
              <select 
                className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md pr-8"
                value={filters.gradeId}
                onChange={e => setFilters({...filters, gradeId: e.target.value})}
              >
                <option value="">Semua</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Kelas</label>
              <select 
                className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md pr-8"
                value={filters.classId}
                onChange={e => setFilters({...filters, classId: e.target.value})}
              >
                <option value="">Semua Kelas</option>
                {classes.filter(c => !filters.gradeId || c.gradeId === filters.gradeId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>
        )}

        {activeTab === 'student_ledger' && (
          <div className="flex flex-col gap-2 flex-1 max-w-md relative">
            <label className="font-label-md text-on-surface-variant">Cari Mahasiswa</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                type="text"
                className="w-full pl-10 pr-10 py-2 bg-surface border border-outline-variant rounded-lg font-body-md focus:border-primary focus:outline-none transition-all"
                placeholder="Nama atau NISN..."
                value={studentSearchQuery}
                onChange={(e) => {
                  setStudentSearchQuery(e.target.value);
                  handleStudentSearch(e.target.value);
                }}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="material-symbols-outlined animate-spin text-primary text-[18px]">progress_activity</span>
                </div>
              )}
            </div>

            {/* Floating Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-surface border border-outline-variant rounded-xl shadow-elevation-3 z-[60] max-h-[300px] overflow-y-auto">
                {searchResults.map(s => (
                  <button
                    key={s.id}
                    className="w-full text-left p-3 hover:bg-surface-container-high transition-colors flex flex-col border-b border-outline-variant last:border-0"
                    onClick={() => handleSelectStudent(s)}
                  >
                    <span className="font-bold text-on-surface text-body-md">{s.fullName}</span>
                    <span className="text-on-surface-variant text-[11px] uppercase tracking-wider">NISN: {s.nisn || '-'} • {s.class?.grade?.name} {s.class?.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'class_summary' && (
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-on-surface-variant">Pilih Kelas</label>
            <select 
              className="bg-surface border border-outline-variant rounded-lg p-2 font-body-md pr-8"
              value={filters.classId}
              onChange={e => setFilters({...filters, classId: e.target.value})}
            >
              <option value="">Pilih Kelas...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.grade?.name} {c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
            <p className="font-body-md text-on-surface-variant">Memproses data laporan...</p>
          </div>
        ) : !data || (Array.isArray(data) && data.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-5xl">folder_off</span>
            <p className="font-body-lg text-on-surface-variant">Tidak ada data untuk periode/filter ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative print:overflow-visible">
            {/* Conditional Tables Based on Tab */}
            {['income_daily', 'income_monthly'].includes(activeTab) && Array.isArray(data) && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container sticky top-0 z-20">
                  <tr>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Kode TRX</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Siswa</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Metode</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(tx => (
                    <tr key={tx.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-4 border-b border-outline-variant font-tabular-nums">{tx.transactionCode}</td>
                      <td className="p-4 border-b border-outline-variant">
                        <div className="flex flex-col">
                          <span className="font-medium">{tx.student?.fullName}</span>
                          <span className="text-[12px] text-on-surface-variant">{tx.items?.map(i => i.billingItem?.feeTemplate?.name).join(', ')}</span>
                        </div>
                      </td>
                      <td className="p-4 border-b border-outline-variant capitalize">{tx.paymentMethod}</td>
                      <td className="p-4 border-b border-outline-variant text-right font-bold">{formatRupiah(tx.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-container-low font-bold">
                    <td colSpan="3" className="p-4 text-right">TOTAL PEMASUKAN</td>
                    <td className="p-4 text-right text-primary">{formatRupiah(data.reduce((sum, tx) => sum + Number(tx.total || 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'expenses' && Array.isArray(data) && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container sticky top-0 z-20">
                  <tr>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Tanggal</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Kategori</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Keterangan</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(exp => (
                    <tr key={exp.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-4 border-b border-outline-variant">{new Date(exp.date).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 border-b border-outline-variant capitalize">{exp.category}</td>
                      <td className="p-4 border-b border-outline-variant text-on-surface-variant">{exp.description || '-'}</td>
                      <td className="p-4 border-b border-outline-variant text-right font-bold text-error">{formatRupiah(exp.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-container-low font-bold">
                    <td colSpan="3" className="p-4 text-right">TOTAL PENGELUARAN</td>
                    <td className="p-4 text-right text-error">{formatRupiah(data.reduce((sum, exp) => sum + Number(exp.amount || 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'delinquency' && Array.isArray(data) && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container sticky top-0 z-20">
                  <tr>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Siswa</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Kelas</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Tagihan</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Periode</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(it => (
                    <tr key={it.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-4 border-b border-outline-variant">{it.student?.fullName}</td>
                      <td className="p-4 border-b border-outline-variant">{it.student?.class?.grade?.name} {it.student?.class?.name}</td>
                      <td className="p-4 border-b border-outline-variant">{it.feeTemplate?.name}</td>
                      <td className="p-4 border-b border-outline-variant">{monthNames[it.billingMonth]} {it.billingYear}</td>
                      <td className="p-4 border-b border-outline-variant text-right font-bold text-error">{formatRupiah(it.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-container-low font-bold">
                    <td colSpan="4" className="p-4 text-right">TOTAL TUNGGAKAN</td>
                    <td className="p-4 text-right text-error">{formatRupiah(data.reduce((sum, it) => sum + Number(it.amount || 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'student_ledger' && data?.student && (
              <div className="p-8">
                <div className="flex justify-between items-start mb-8 border-b border-outline-variant pb-6">
                  <div>
                    <h3 className="text-display-sm font-display mb-2">{data.student.fullName}</h3>
                    <p className="text-body-lg text-on-surface-variant m-0">NISN: {data.student.nisn} • Kelas: {data.student.class?.grade?.name} {data.student.class?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-label-md text-on-surface-variant uppercase m-0 mb-1">Total Tunggakan</p>
                    <p className="text-headline-lg font-bold text-error m-0">{formatRupiah((data.billingItems || []).filter(i => i.status !== 'paid').reduce((sum, i) => sum + Number(i.amount || 0), 0))}</p>
                  </div>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b border-outline-variant">
                      <th className="py-4 font-label-lg">Tagihan</th>
                      <th className="py-4 font-label-lg">Periode</th>
                      <th className="py-4 font-label-lg">Nominal</th>
                      <th className="py-4 font-label-lg">Status</th>
                      <th className="py-4 font-label-lg text-right">Tanggal Bayar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.billingItems || []).map(it => (
                      <tr key={it.id} className="border-b border-outline-variant/50">
                        <td className="py-4 font-body-md">{it.feeTemplate?.name}</td>
                        <td className="py-4 font-body-md">{monthNames[it.billingMonth]} {it.billingYear}</td>
                        <td className="py-4 font-body-md font-tabular-nums">{formatRupiah(it.amount)}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[12px] font-bold uppercase ${it.status === 'paid' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                            {it.status}
                          </span>
                        </td>
                        <td className="py-4 text-right font-tabular-nums text-on-surface-variant">
                          {it.paidAt ? new Date(it.paidAt).toLocaleDateString('id-ID') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'class_summary' && data?.class && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container sticky top-0 z-20">
                  <tr>
                    <th className="p-4 font-label-lg border-b border-outline-variant">Mahasiswa</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant text-right">Total Tagihan</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant text-right">Sudah Bayar</th>
                    <th className="p-4 font-label-lg border-b border-outline-variant text-right">Tunggakan</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.stats || []).map(s => {
                    const student = (data.class?.students || []).find(st => st.id === s.studentId);
                    return (
                      <tr key={s.studentId} className="hover:bg-surface-container-low transition-colors">
                        <td className="p-4 border-b border-outline-variant">{student?.fullName}</td>
                        <td className="p-4 border-b border-outline-variant text-right font-tabular-nums">{formatRupiah(s.totalBilled)}</td>
                        <td className="p-4 border-b border-outline-variant text-right font-tabular-nums text-secondary font-bold">{formatRupiah(s.totalPaid)}</td>
                        <td className="p-4 border-b border-outline-variant text-right font-tabular-nums text-error font-bold">{formatRupiah(s.totalOutstanding)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-surface-container-low font-bold">
                    <td className="p-4 text-right">GRAND TOTAL KELAS</td>
                    <td className="p-4 text-right font-tabular-nums">{formatRupiah((data.stats || []).reduce((sum, s) => sum + Number(s.totalBilled || 0), 0))}</td>
                    <td className="p-4 text-right font-tabular-nums text-secondary">{formatRupiah((data.stats || []).reduce((sum, s) => sum + Number(s.totalPaid || 0), 0))}</td>
                    <td className="p-4 text-right font-tabular-nums text-error">{formatRupiah((data.stats || []).reduce((sum, s) => sum + Number(s.totalOutstanding || 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Floating Scroll to Top Button */}
      {showScroll && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-elevation-4 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[100] animate-in fade-in slide-in-from-bottom-4"
          title="Kembali ke Atas"
        >
          <span className="material-symbols-outlined text-[32px]">arrow_upward</span>
        </button>
      )}
    </div>
  );
}

