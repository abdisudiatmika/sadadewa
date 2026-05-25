import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';

const statusColors = {
  active: 'bg-secondary-container text-on-secondary-container',
  inactive: 'bg-surface-variant text-on-surface-variant',
  suspended: 'bg-error-container text-on-error-container',
  graduated: 'bg-surface-variant text-on-surface-variant',
};

const avatarColors = [
  'bg-primary-fixed text-on-primary-fixed',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-secondary-container text-on-secondary-container',
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const emptyForm = {
  studentCode: '',
  nisn: '',
  fullName: '',
  classId: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  status: 'active',
};

export default function StudentRecordsPage() {
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const fileInputRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Bulk Selection & Promotion
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ newClassId: '', newAcademicYearId: '' });
  const [academicYearsList, setAcademicYearsList] = useState([]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.getStudents({
        page,
        perPage,
        search: search || undefined,
        classId: filterClassId || undefined,
      });
      setStudents(res.data || []);
      setMeta({ total: res.meta?.total || 0, totalPages: res.meta?.totalPages || 1 });
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getClasses().then(res => setClassesList(res.data || [])).catch(console.error);
    api.getAcademicYears().then(res => setAcademicYearsList(res.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [page, perPage, filterClassId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchStudents();
      } else {
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Open modal for creating
  const openCreateModal = () => {
    setEditingStudent(null);
    setForm({ ...emptyForm });
    setFormError('');
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (student) => {
    setEditingStudent(student);
    setForm({
      studentCode: student.studentCode || '',
      nisn: student.nisn || '',
      fullName: student.fullName || '',
      classId: student.classId || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
      status: student.status || 'active',
    });
    setFormError('');
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.nisn || !form.fullName) {
      setFormError('NISN dan Full Name wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, form);
      } else {
        await api.createStudent(form);
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan data siswa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus siswa "${student.fullName}" secara PERMANEN?\nSemua data tagihan dan riwayat transaksi siswa ini juga akan ikut terhapus.`)) return;
    try {
      await api.deleteStudent(student.id);
      fetchStudents();
    } catch (err) {
      alert('Gagal menghapus siswa: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.size} siswa terpilih secara PERMANEN?\nSemua data tagihan dan riwayat transaksi mereka juga akan ikut terhapus.`)) return;
    
    setLoading(true);
    try {
      await api.bulkDeleteStudents(Array.from(selectedIds));
      alert(`✅ Berhasil menghapus ${selectedIds.size} siswa secara permanen!`);
      setSelectedIds(new Set());
      fetchStudents();
    } catch (err) {
      alert('Gagal menghapus siswa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    const allCurrentSelected = students.length > 0 && students.every(s => selectedIds.has(s.id));
    const newSet = new Set(selectedIds);
    if (allCurrentSelected) {
      students.forEach(s => newSet.delete(s.id));
    } else {
      students.forEach(s => newSet.add(s.id));
    }
    setSelectedIds(newSet);
  };

  const handlePromote = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      await api.promoteStudents({
        studentIds: Array.from(selectedIds),
        newClassId: promoteForm.newClassId,
        newAcademicYearId: promoteForm.newAcademicYearId,
      });
      alert('✅ Kenaikan kelas berhasil diproses!');
      setShowPromoteModal(false);
      setSelectedIds(new Set());
      fetchStudents();
    } catch (err) {
      alert('Gagal mutasi kelas: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleDownloadTemplate = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || '';
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = `${API_BASE || ''}/api/students/template`;
      // Target _blank is safe for downloads
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download template', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Ubah data sheet jadi JSON array (mengabaikan baris kosong)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (jsonData.length === 0) {
        throw new Error("File Excel kosong atau tidak valid.");
      }

      // Pastikan format isiannya string dan trim spasi berlebih
      const records = jsonData.map(row => {
        const rawClassStr = String(row.gradeAndClass || row.KELAS || row.Kelas || row.kelas || "").trim().toLowerCase();
        let matchedClassId = null;
        
        if (rawClassStr) {
          // Normalisasi string dari user (hapus kata "kelas" atau "kls" di depan)
          const normalizedRaw = rawClassStr.replace(/^(kelas|kls)\s+/i, '').trim();
          const cleanRaw = normalizedRaw.replace(/[^a-z0-9]/g, '');

          // 1. Cari kecocokan persis (e.g. "10 PPLG 1" === "10 PPLG 1")
          let matched = classesList.find(c => {
             const fullName = `${c.grade?.name || ''} ${c.name || ''}`.trim().toLowerCase();
             const normalizedFull = fullName.replace(/^(kelas|kls)\s+/i, '').trim();
             return normalizedFull === normalizedRaw;
          });
          
          // 2. Fallback: kecocokan parsial/awalan (e.g. "10 PPLG" cocok dengan "10 PPLG 1")
          if (!matched) {
            matched = classesList.find(c => {
              const fullName = `${c.grade?.name || ''} ${c.name || ''}`.trim().toLowerCase();
              const normalizedFull = fullName.replace(/^(kelas|kls)\s+/i, '').trim();
              const cleanFull = normalizedFull.replace(/[^a-z0-9]/g, '');
              return cleanFull.startsWith(cleanRaw) || cleanRaw.startsWith(cleanFull);
            });
          }

          // 3. Fallback: kecocokan nama tingkat + nama kelas secara terpisah
          if (!matched) {
            matched = classesList.find(c => {
              const gName = (c.grade?.name || '').trim().toLowerCase();
              const cName = (c.name || '').trim().toLowerCase();
              const cleanCName = cName.replace(/[^a-z0-9]/g, '');
              return cleanRaw.includes(gName) && (cleanRaw.includes(cleanCName) || cleanCName.includes(cleanRaw.replace(gName, '').trim()));
            });
          }

          if (matched) matchedClassId = matched.id;
        }

        return {
          studentCode: String(row.studentCode || row.StudentCode || "").trim(),
          nisn: String(row.nisn || row.NISN || row.Nisn || "").trim(),
          fullName: String(row.fullName || row.NAMA || row.Nama || row.nama || "").trim(),
          classId: matchedClassId,
          guardianName: String(row.guardianName || row['NAMA AYAH'] || row['Nama Ayah'] || "").trim(),
          guardianPhone: String(row.guardianPhone || row.GuardianPhone || row.NoHP || "").trim(),
          guardianEmail: String(row.guardianEmail || row.GuardianEmail || "").trim(),
          status: (() => {
            const s = String(row.status || row.Status || "active").trim().toLowerCase();
            if (s === "aktif") return "active";
            if (s === "tidak aktif") return "inactive";
            if (s === "lulus") return "graduated";
            if (s === "skorsing") return "suspended";
            return ["active", "inactive", "suspended", "graduated"].includes(s) ? s : "active";
          })()
        };
      }).filter(r => r.studentCode && r.fullName); // Abaikan baris jika tidak ada nama/kode

      if (records.length === 0) {
        throw new Error("Tidak menemukan data valid untuk diunggah. Pastikan kolom 'studentCode' dan 'NAMA' (atau 'fullName') terisi.");
      }

      const res = await api.bulkUploadStudents(records);
      alert(`Berhasil mengunggah ${res.data.imported} siswa!`);
      fetchStudents();
    } catch (error) {
      alert("Gagal mengunggah file: " + error.message);
    } finally {
      setLoading(false);
      // Reset input file agar bisa upload file yang sama lagi jika error
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
        <div>
          <h2 className="text-xl font-bold text-on-background mb-0.5 m-0">Master Siswa</h2>
          <p className="text-xs text-on-surface-variant m-0">Kelola dan atur data siswa serta administrasi kelas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-surface border border-outline px-3.5 py-1.5 rounded-lg font-body-md text-sm font-medium text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Excel
          </button>
          <button
            onClick={openCreateModal}
            className="bg-[#0D9488] text-white px-4 py-1.5 rounded-lg hover:bg-[#0F766E] transition-colors flex items-center gap-1.5 shadow-sm font-medium text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Tambah Siswa
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-tertiary-container text-on-tertiary-container px-4 py-3 rounded-xl flex items-center justify-between animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-2 font-body-md font-medium">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            {selectedIds.size} Siswa Terpilih
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-1.5 rounded-lg border border-on-tertiary-container/30 hover:bg-on-tertiary-container/10 transition-colors font-label-md"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-1.5 bg-error-container text-on-error-container hover:opacity-90 rounded-lg shadow-sm font-label-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Hapus Masal
            </button>
            <button
              onClick={() => setShowPromoteModal(true)}
              className="px-4 py-1.5 bg-on-tertiary-container text-tertiary-container rounded-lg shadow-sm hover:opacity-90 transition-opacity font-label-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">upgrade</span>
              Mutasi / Naik Kelas
            </button>
          </div>
        </div>
      )}

      {/* Import Excel Dropzone (Compact) */}
      <div className="mb-4 bg-surface-container-lowest border border-dashed border-outline-variant rounded-lg p-3 flex flex-col md:flex-row items-center justify-between cursor-pointer hover:bg-surface-container-low hover:border-secondary transition-all group">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary-container rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <span className="material-symbols-outlined text-on-secondary-container text-[18px]">upload_file</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface m-0">Import Siswa dari Excel</h3>
            <p className="text-xs text-on-surface-variant m-0">Pilih file Excel (.xlsx) untuk upload data siswa secara masal.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button onClick={handleDownloadTemplate} className="bg-surface border border-outline px-3 py-1 rounded-md text-xs font-medium text-on-surface hover:bg-surface-container transition-colors">Download Template</button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-primary text-on-primary px-3 py-1 rounded-md text-xs font-medium hover:bg-on-background transition-colors"
          >
            Pilih File
          </button>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72 focus-within:ring-1 focus-within:ring-secondary rounded-lg">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                className="w-full h-10 pl-10 pr-4 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary transition-all"
                placeholder="Search student name or ID..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-label-sm text-on-surface-variant whitespace-nowrap hidden sm:block">Kelas:</label>
              <select 
                className="h-10 px-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary cursor-pointer"
                value={filterClassId}
                onChange={(e) => {
                  setFilterClassId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Kelas</option>
                {classesList.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.grade?.name} {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="font-label-sm text-on-surface-variant whitespace-nowrap hidden sm:block">Show:</label>
              <select 
                className="h-10 px-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary cursor-pointer"
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
          </div>
          <div className="font-label-md text-label-md text-on-surface-variant">
            Total: {meta.total} siswa
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 relative">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined text-secondary text-4xl animate-spin">progress_activity</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-surface-container border-b border-outline-variant sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-1.5 px-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded text-secondary focus:ring-secondary cursor-pointer"
                      checked={students.length > 0 && students.every(s => selectedIds.has(s.id))}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-1.5 px-3 font-medium text-on-surface-variant">Student ID</th>
                  <th className="py-1.5 px-3 font-medium text-on-surface-variant">Full Name</th>
                  <th className="py-1.5 px-3 font-medium text-on-surface-variant">NISN</th>
                  <th className="py-1.5 px-3 font-medium text-on-surface-variant">Grade & Class (Aktif)</th>
                  <th className="py-1.5 px-3 font-medium text-on-surface-variant">Guardian Contact</th>
                  <th className="py-1.5 px-3 font-medium text-on-surface-variant text-center">Status</th>
                  <th className="py-1.5 px-3 font-medium text-on-surface-variant text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-on-surface-variant font-body-md">
                      No students found
                    </td>
                  </tr>
                ) : (
                  students.map((student, i) => (
                    <tr key={student.id} className={`hover:bg-surface-container-low transition-colors group ${i % 2 !== 0 ? 'bg-surface' : ''} ${selectedIds.has(student.id) ? 'bg-tertiary-container/20' : ''}`}>
                      <td className="py-1.5 px-3">
                        <input 
                          type="checkbox" 
                          className="rounded text-secondary focus:ring-secondary cursor-pointer"
                          checked={selectedIds.has(student.id)}
                          onChange={() => toggleSelect(student.id)}
                        />
                      </td>
                      <td className="py-1.5 px-3 font-tabular-nums text-tabular-nums text-on-surface">{student.studentCode}</td>
                      <td className="py-1.5 px-3">
                        <Link 
                          to={`/billing?studentId=${student.id}`}
                          className="flex items-center gap-2 group/link hover:bg-secondary-container/30 p-0.5 -m-0.5 rounded-lg transition-colors"
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] ${avatarColors[i % avatarColors.length]}`}>
                            {getInitials(student.fullName)}
                          </div>
                          <span className="text-on-surface font-medium group-hover/link:text-secondary group-hover/link:underline decoration-2 underline-offset-4 decoration-secondary/30">
                            {student.fullName}
                          </span>
                        </Link>
                      </td>
                      <td className="py-1.5 px-3 font-tabular-nums text-tabular-nums text-on-surface-variant">{student.nisn}</td>
                      <td className="py-1.5 px-3">
                        {student.grade?.name || ''} {student.class?.name || ''}
                      </td>
                      <td className="py-1.5 px-3 font-tabular-nums text-tabular-nums text-on-surface-variant">
                        {student.guardianPhone || '-'}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs capitalize ${statusColors[student.status] || 'bg-surface-variant text-on-surface-variant'}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <button
                          className="p-1 text-on-surface-variant hover:text-secondary rounded-md hover:bg-surface-container transition-colors"
                          title="Edit"
                          onClick={() => openEditModal(student)}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          className="p-1 text-on-surface-variant hover:text-error rounded-md hover:bg-error-container transition-colors"
                          title="Delete"
                          onClick={() => handleDelete(student)}
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
          <span className="font-body-md text-body-md text-on-surface-variant">
            Page {page} of {meta.totalPages} ({meta.total} entries)
          </span>
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="w-8 h-8 flex items-center justify-center rounded-md bg-secondary text-on-secondary font-tabular-nums text-tabular-nums">{page}</span>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== ADD/EDIT STUDENT MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />

          {/* Modal Card */}
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-outline-variant animate-[fadeIn_0.2s_ease-out]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary-container rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container">
                    {editingStudent ? 'edit' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface m-0">
                    {editingStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}
                  </h3>
                  <p className="font-label-md text-label-md text-on-surface-variant m-0">
                    {editingStudent ? `Editing: ${editingStudent.fullName}` : 'Fill in student details below'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              {formError && (
                <div className="mb-4 bg-error-container text-on-error-container px-4 py-3 rounded-lg font-body-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[20px]">error</span>
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Student Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Student Code (System Generated)</label>
                  <input
                    className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-lg font-body-md text-on-surface-variant focus:outline-none opacity-80 cursor-not-allowed"
                    placeholder="Auto-generate"
                    value={form.studentCode}
                    readOnly
                    disabled
                  />
                </div>

                {/* NISN */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">NISN *</label>
                  <input
                    className="px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    placeholder="0098765400"
                    value={form.nisn}
                    onChange={(e) => updateField('nisn', e.target.value)}
                    required
                  />
                </div>

                {/* Full Name — span 2 cols */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">Full Name *</label>
                  <input
                    className="px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    placeholder="Nama lengkap siswa"
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    required
                  />
                </div>

                {/* Class Selection */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">Grade & Class</label>
                  <select
                    className="px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all appearance-none cursor-pointer"
                    value={form.classId}
                    onChange={(e) => updateField('classId', e.target.value)}
                  >
                    <option value="">- Select Class -</option>
                    {classesList.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.grade?.name} {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Guardian Name */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">Guardian Name</label>
                  <input
                    className="px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    placeholder="Nama wali/orang tua"
                    value={form.guardianName}
                    onChange={(e) => updateField('guardianName', e.target.value)}
                  />
                </div>

                {/* Guardian Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Guardian Phone</label>
                  <input
                    className="px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    placeholder="+62 812-xxxx-xxxx"
                    value={form.guardianPhone}
                    onChange={(e) => updateField('guardianPhone', e.target.value)}
                  />
                </div>

                {/* Guardian Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Guardian Email</label>
                  <input
                    type="email"
                    className="px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    placeholder="email@example.com"
                    value={form.guardianEmail}
                    onChange={(e) => updateField('guardianEmail', e.target.value)}
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">Status</label>
                  <select
                    className="px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all appearance-none cursor-pointer"
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-surface border border-outline-variant text-on-surface rounded-lg font-body-md hover:bg-surface-container transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-medium hover:bg-on-secondary-container transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      {editingStudent ? 'Update' : 'Simpan'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PROMOTE STUDENTS MODAL ===== */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPromoteModal(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-lowest rounded-t-2xl">
              <h3 className="font-headline-sm text-on-surface m-0">Mutasi / Kenaikan Kelas</h3>
              <button onClick={() => setShowPromoteModal(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handlePromote} className="p-6 space-y-4">
              <div className="bg-secondary-container/30 px-4 py-3 rounded-xl mb-2 text-on-surface-variant font-body-sm">
                Anda akan mendaftarkan <strong className="text-secondary">{selectedIds.size} siswa</strong> terpilih ke dalam Tahun Ajaran dan Kelas yang baru. Histori kelas lama akan tetap tersimpan.
              </div>
              
              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Tahun Ajaran Tujuan</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary"
                  value={promoteForm.newAcademicYearId}
                  onChange={(e) => setPromoteForm(f => ({ ...f, newAcademicYearId: e.target.value }))}
                >
                  <option value="">- Pilih Tahun Ajaran -</option>
                  {academicYearsList.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name} {ay.isActive ? '(Aktif)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Kelas Tujuan</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary"
                  value={promoteForm.newClassId}
                  onChange={(e) => setPromoteForm(f => ({ ...f, newClassId: e.target.value }))}
                >
                  <option value="">- Pilih Kelas Tujuan -</option>
                  {classesList.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.grade?.name} {cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
                <button type="button" onClick={() => setShowPromoteModal(false)} className="px-4 py-2 hover:bg-surface-container rounded-lg">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-medium flex items-center gap-2">
                  {saving ? 'Memproses...' : 'Proses Mutasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
