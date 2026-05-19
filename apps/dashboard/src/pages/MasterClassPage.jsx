import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function MasterClassPage() {
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' or 'grades'
  
  // Data State
  const [grades, setGrades] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYearsList, setAcademicYearsList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('class'); // 'class' or 'grade'
  const [editingItem, setEditingItem] = useState(null);
  
  // Copy Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyForm, setCopyForm] = useState({ sourceAcademicYearId: '', targetAcademicYearId: '' });
  const [copying, setCopying] = useState(false);
  
  // Form State
  const [gradeForm, setGradeForm] = useState({ name: '', level: 10 });
  const [classForm, setClassForm] = useState({ name: '', gradeId: '', homeroomTeacher: '', homeroomTeacherId: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
 
  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [gradesRes, classesRes, teachersRes, ayRes] = await Promise.all([
        api.getGrades(),
        api.getClassesMaster(),
        api.getTeachers().catch(() => ({ data: [] })),
        api.getAcademicYears().catch(() => ({ data: [] }))
      ]);
      setGrades(gradesRes.data || []);
      setClassesList(classesRes.data || []);
      setTeachers(teachersRes.data || []);
      setAcademicYearsList(ayRes.data || []);
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    fetchData();
  }, []);
 
  // Modals
  const openGradeModal = (grade = null) => {
    setModalType('grade');
    setEditingItem(grade);
    setGradeForm(grade ? { name: grade.name, level: grade.level } : { name: '', level: 10 });
    setFormError('');
    setShowModal(true);
  };
 
  const openClassModal = (cls = null) => {
    setModalType('class');
    setEditingItem(cls);
    setClassForm(cls ? { 
      name: cls.name, 
      gradeId: cls.gradeId, 
      homeroomTeacher: cls.homeroomTeacher || '',
      homeroomTeacherId: cls.homeroomTeacherId || ''
    } : { name: '', gradeId: grades[0]?.id || '', homeroomTeacher: '', homeroomTeacherId: '' });
    setFormError('');
    setShowModal(true);
  };

  // Submit Forms
  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...gradeForm, level: Number(gradeForm.level) };
      if (editingItem) {
        await api.updateGrade(editingItem.id, payload);
      } else {
        await api.createGrade(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan tingkat.');
    } finally {
      setSaving(false);
    }
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (!classForm.gradeId) {
        throw new Error('Pilih Tingkat (Grade) terlebih dahulu.');
      }
      if (editingItem) {
        await api.updateClass(editingItem.id, classForm);
      } else {
        await api.createClass(classForm);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan kelas.');
    } finally {
      setSaving(false);
    }
  };

  // Deletes
  const handleDeleteGrade = async (grade) => {
    if (!confirm(`Hapus tingkat "${grade.name}"? Ini akan mengubah status siswa dan kelas terkait menjadi tanpa tingkat.`)) return;
    try {
      await api.deleteGrade(grade.id);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleDeleteClass = async (cls) => {
    if (!confirm(`Hapus kelas/jurusan "${cls.name}"? Ini akan menghapus kaitan kelas dari siswa yang berada di kelas ini.`)) return;
    try {
      await api.deleteClass(cls.id);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleCopySubmit = async (e) => {
    e.preventDefault();
    if (!copyForm.sourceAcademicYearId || !copyForm.targetAcademicYearId) {
      alert('Pilih Tahun Ajaran Sumber dan Tujuan');
      return;
    }
    setCopying(true);
    try {
      const res = await api.copyClassesMaster(copyForm);
      alert(`Berhasil menyalin ${res.data.copied} kelas!`);
      setShowCopyModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyalin kelas: ' + err.message);
    } finally {
      setCopying(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-1 m-0">Master Class</h2>
          <p className="font-body-md text-body-md text-on-surface-variant m-0">Kelola master data Tingkat (Grade) dan Jurusan/Ruang Kelas (Class).</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCopyModal(true)}
            className="bg-secondary-container text-on-secondary-container border border-outline px-4 py-2.5 rounded-lg font-body-md font-medium hover:bg-secondary-container/80 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">content_copy</span>
            Salin Kelas dari Tahun Lalu
          </button>
          <button
            onClick={() => openGradeModal()}
            className="bg-surface border border-outline px-4 py-2.5 rounded-lg font-body-md text-body-md font-medium text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Tambah Tingkat
          </button>
          <button
            onClick={() => openClassModal()}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-lg hover:bg-on-background transition-colors flex items-center gap-2 shadow-sm font-medium font-body-md"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Tambah Jurusan/Kelas
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-6">
        <button
          className={`px-6 py-3 font-label-md text-label-md font-medium border-b-2 transition-colors ${
            activeTab === 'classes' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest'
          }`}
          onClick={() => setActiveTab('classes')}
        >
          Data Kelas / Jurusan
        </button>
        <button
          className={`px-6 py-3 font-label-md text-label-md font-medium border-b-2 transition-colors ${
            activeTab === 'grades' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest'
          }`}
          onClick={() => setActiveTab('grades')}
        >
          Master Tingkat (Grade)
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined text-secondary text-4xl animate-spin">progress_activity</span>
          </div>
        ) : activeTab === 'classes' ? (
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container border-b border-outline-variant sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Nama Kelas / Jurusan</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Tingkat</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Wali Kelas</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {classesList.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant">Belum ada data kelas</td></tr>
                ) : (
                  classesList.map(cls => (
                    <tr key={cls.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="py-4 px-4 font-body-md font-bold text-on-surface">{cls.name}</td>
                      <td className="py-4 px-4 font-body-md text-on-surface">
                        <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md text-xs font-bold">
                          {cls.grade?.name || 'Unknown Grade'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-body-md text-on-surface-variant">
                        {cls.teacherAccount ? (
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <span className="material-symbols-outlined text-[18px]">verified_user</span>
                            {cls.teacherAccount.name}
                          </div>
                        ) : (
                          cls.homeroomTeacher || '-'
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button onClick={() => openClassModal(cls)} className="p-1.5 text-on-surface-variant hover:text-secondary rounded-md hover:bg-surface-container mr-1">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleDeleteClass(cls)} className="p-1.5 text-on-surface-variant hover:text-error rounded-md hover:bg-error-container">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container border-b border-outline-variant sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Tingkat Kelas</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium">Level Numerik</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {grades.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-on-surface-variant">Belum ada data tingkat</td></tr>
                ) : (
                  grades.map(grade => (
                    <tr key={grade.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="py-4 px-4 font-body-md font-bold text-on-surface">{grade.name}</td>
                      <td className="py-4 px-4 font-body-md text-on-surface-variant">Level {grade.level}</td>
                      <td className="py-4 px-4 text-right">
                        <button onClick={() => openGradeModal(grade)} className="p-1.5 text-on-surface-variant hover:text-secondary rounded-md hover:bg-surface-container mr-1">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleDeleteGrade(grade)} className="p-1.5 text-on-surface-variant hover:text-error rounded-md hover:bg-error-container">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-outline-variant animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <h3 className="font-headline-md text-on-surface m-0">
                {editingItem ? 'Edit' : 'Tambah'} {modalType === 'grade' ? 'Tingkat' : 'Kelas / Jurusan'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={modalType === 'grade' ? handleGradeSubmit : handleClassSubmit} className="p-6">
              {formError && (
                <div className="mb-4 bg-error-container text-on-error-container px-4 py-3 rounded-lg font-body-md flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span> {formError}
                </div>
              )}

              {modalType === 'grade' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface-variant">Nama Tingkat (cth: "10" atau "Kelas X")</label>
                    <input
                      className="px-3 py-2 bg-surface border border-outline-variant rounded-lg"
                      value={gradeForm.name}
                      onChange={e => setGradeForm({...gradeForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface-variant">Level Numerik (cth: 10)</label>
                    <input
                      type="number"
                      className="px-3 py-2 bg-surface border border-outline-variant rounded-lg"
                      value={gradeForm.level}
                      onChange={e => setGradeForm({...gradeForm, level: e.target.value})}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface-variant">Tingkat</label>
                    <select
                      className="px-3 py-2 bg-surface border border-outline-variant rounded-lg cursor-pointer"
                      value={classForm.gradeId}
                      onChange={e => setClassForm({...classForm, gradeId: e.target.value})}
                      required
                    >
                      <option value="" disabled>Pilih Tingkat</option>
                      {grades.map(g => (
                        <option key={g.id} value={g.id}>{g.name} (Level {g.level})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface-variant">Nama Jurusan / Ruang (cth: "RPL 1" atau "BD")</label>
                    <input
                      className="px-3 py-2 bg-surface border border-outline-variant rounded-lg"
                      value={classForm.name}
                      onChange={e => setClassForm({...classForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface-variant">Akun Wali Kelas (Untuk Login)</label>
                    <select
                      className="px-3 py-2 bg-surface border border-outline-variant rounded-lg cursor-pointer"
                      value={classForm.homeroomTeacherId}
                      onChange={e => setClassForm({...classForm, homeroomTeacherId: e.target.value})}
                    >
                      <option value="">-- Pilih Akun Guru --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-on-surface-variant m-0 italic">Akun ini yang akan memiliki akses ke Portal Wali Kelas untuk kelas ini.</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface-variant">Nama Tampilan Wali Kelas (Opsional)</label>
                    <input
                      className="px-3 py-2 bg-surface border border-outline-variant rounded-lg"
                      value={classForm.homeroomTeacher}
                      onChange={e => setClassForm({...classForm, homeroomTeacher: e.target.value})}
                      placeholder="Cth: Bpk. Budi, S.Pd"
                    />
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-on-primary rounded-lg font-body-md font-medium hover:bg-on-background transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== COPY MODAL ===== */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCopyModal(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-lowest rounded-t-2xl">
              <h3 className="font-headline-sm text-on-surface m-0">Salin Data Kelas</h3>
              <button onClick={() => setShowCopyModal(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCopySubmit} className="p-6 space-y-4">
              <div className="bg-secondary-container/30 px-4 py-3 rounded-xl mb-2 text-on-surface-variant font-body-sm">
                Sistem akan menyalin <strong>semua kelas dan jurusan</strong> dari Tahun Ajaran Sumber ke Tahun Ajaran Tujuan. (Kelas yang memiliki nama yang sama di tahun tujuan akan dilewati otomatis).
              </div>
              
              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Tahun Ajaran Sumber (Asal)</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary"
                  value={copyForm.sourceAcademicYearId}
                  onChange={(e) => setCopyForm(f => ({ ...f, sourceAcademicYearId: e.target.value }))}
                >
                  <option value="">- Pilih Tahun Ajaran Asal -</option>
                  {academicYearsList.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Tahun Ajaran Tujuan</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-secondary"
                  value={copyForm.targetAcademicYearId}
                  onChange={(e) => setCopyForm(f => ({ ...f, targetAcademicYearId: e.target.value }))}
                >
                  <option value="">- Pilih Tahun Ajaran Tujuan -</option>
                  {academicYearsList.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name} {ay.isActive ? '(Aktif)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
                <button type="button" onClick={() => setShowCopyModal(false)} className="px-4 py-2 hover:bg-surface-container rounded-lg">Batal</button>
                <button type="submit" disabled={copying} className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-medium flex items-center gap-2">
                  {copying ? 'Menyalin...' : 'Mulai Salin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
