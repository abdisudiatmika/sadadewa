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
      const res = await api.getStudents({ page, perPage, search: search || undefined });
      setStudents(res.data || []);
      setMeta({ total: res.total || 0, totalPages: res.totalPages || 1 });
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchStudents(); 
    api.getClasses().then(res => setClassesList(res.data || [])).catch(console.error);
    api.getAcademicYears().then(res => setAcademicYearsList(res.data || [])).catch(console.error);
  }, [page, perPage]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchStudents(); }, 400);
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
    if (!confirm(`Hapus siswa "${student.fullName}"? Status akan diubah menjadi inactive.`)) return;
    try {
      await api.deleteStudent(student.id);
      fetchStudents();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
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
        const rawClassStr = String(row.gradeAndClass || "").trim().toLowerCase();
        let matchedClassId = null;
        
        if (rawClassStr) {
          // Cari class berdasarkan gabungan nama tingkat dan kelas, misalnya "10 BD 1"
          const matched = classesList.find(c => {
             const fullName = `${c.grade?.name || ''} ${c.name || ''}`.trim().toLowerCase();
             return fullName === rawClassStr;
          });
          if (matched) matchedClassId = matched.id;
        }

        return {
          studentCode: String(row.studentCode || "").trim(),
          nisn: String(row.nisn || "").trim(),
          fullName: String(row.fullName || "").trim(),
          classId: matchedClassId,
          guardianName: String(row.guardianName || "").trim(),
          guardianPhone: String(row.guardianPhone || "").trim(),
          guardianEmail: String(row.guardianEmail || "").trim(),
          status: String(row.status || "active").toLowerCase()
        };
      }).filter(r => r.studentCode && r.fullName); // Abaikan baris jika tidak ada nama/kode

      if (records.length === 0) {
        throw new Error("Tidak menemukan data valid untuk diunggah.");
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
    <>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-1 m-0">Master Siswa</h2>
          <p className="font-body-md text-body-md text-on-surface-variant m-0">Manage and organize student records, grades, and administrative data.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-surface border border-outline px-4 py-2.5 rounded-lg font-body-md text-body-md font-medium text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Export Excel
          </button>
          <button
            onClick={openCreateModal}
            className="bg-[#0D9488] text-white px-5 py-2.5 rounded-lg hover:bg-[#0F766E] transition-colors flex items-center gap-2 shadow-sm font-medium font-body-md"
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
      <div className="mb-card-gap bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-5 flex flex-col md:flex-row items-center justify-between cursor-pointer hover:bg-surface-container-low hover:border-secondary transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <span className="material-symbols-outlined text-on-secondary-container text-[20px]">upload_file</span>
          </div>
          <div>
            <h3 className="font-title-md text-title-md text-on-surface mb-0.5 m-0">Upload Bulk Student Data</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant m-0">Drag and drop your Excel (.xlsx) file here, or click to browse.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <button onClick={handleDownloadTemplate} className="bg-surface border border-outline px-4 py-1.5 rounded-lg font-body-sm text-body-sm font-medium text-on-surface hover:bg-surface-container transition-colors">Download Template</button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-primary text-on-primary px-4 py-1.5 rounded-lg font-body-sm text-body-sm font-medium hover:bg-on-background transition-colors"
          >
            Select File
          </button>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden">
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
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined text-secondary text-4xl animate-spin">progress_activity</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container border-b border-outline-variant sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded text-secondary focus:ring-secondary cursor-pointer"
                      checked={students.length > 0 && selectedIds.size === students.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Student ID</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Full Name</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">NISN</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Grade & Class (Aktif)</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Guardian Contact</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium text-right">Actions</th>
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
                      <td className="py-4 px-4">
                        <input 
                          type="checkbox" 
                          className="rounded text-secondary focus:ring-secondary cursor-pointer"
                          checked={selectedIds.has(student.id)}
                          onChange={() => toggleSelect(student.id)}
                        />
                      </td>
                      <td className="py-4 px-4 font-tabular-nums text-tabular-nums text-on-surface">{student.studentCode}</td>
                      <td className="py-4 px-4">
                        <Link 
                          to={`/billing?studentId=${student.id}`}
                          className="flex items-center gap-3 group/link hover:bg-secondary-container/30 p-1 -m-1 rounded-lg transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-headline-md text-[14px] ${avatarColors[i % avatarColors.length]}`}>
                            {getInitials(student.fullName)}
                          </div>
                          <span className="font-body-md text-body-md text-on-surface font-medium group-hover/link:text-secondary group-hover/link:underline decoration-2 underline-offset-4 decoration-secondary/30">
                            {student.fullName}
                          </span>
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-tabular-nums text-tabular-nums text-on-surface-variant">{student.nisn}</td>
                      <td className="py-4 px-4 font-body-md text-body-md text-on-surface">
                        {student.grade?.name || ''} {student.class?.name || ''}
                      </td>
                      <td className="py-4 px-4 font-tabular-nums text-tabular-nums text-on-surface-variant">
                        {student.guardianPhone || '-'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-md text-label-md capitalize ${statusColors[student.status] || 'bg-surface-variant text-on-surface-variant'}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          className="p-1.5 text-on-surface-variant hover:text-secondary rounded-md hover:bg-surface-container transition-colors"
                          title="Edit"
                          onClick={() => openEditModal(student)}
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          className="p-1.5 text-on-surface-variant hover:text-error rounded-md hover:bg-error-container transition-colors"
                          title="Delete"
                          onClick={() => handleDelete(student)}
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
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
    </>
  );
}
