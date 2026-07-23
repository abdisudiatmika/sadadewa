import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function WaliKelasPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      const allUsers = res.data || [];
      setTeachers(allUsers.filter(u => u.role === 'teacher'));
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setForm(user ? { name: user.name, email: user.email, password: '' } : { name: '', email: '', password: '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, { name: form.name, email: form.email, role: 'teacher' });
      } else {
        await api.createUser({ ...form, role: 'teacher' });
      }
      setShowModal(false);
      fetchTeachers();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data wali kelas.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Hapus akun wali kelas "${user.name}"?\n\nData kelas yang sudah ditugaskan kepadanya perlu diperbarui secara manual.`)) return;
    try {
      await api.deleteUser(user.id);
      fetchTeachers();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="p-container-padding space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-1 m-0">Manajemen Wali Kelas</h2>
          <p className="font-body-md text-body-md text-on-surface-variant m-0">
            Kelola akun login wali kelas. Setelah ditambahkan, wali kelas bisa dipilih saat mengatur kelas di Master Kelas.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label-md font-bold flex items-center gap-2 shadow-sm hover:bg-on-background transition-colors shrink-0"
        >
          <span className="material-symbols-outlined">person_add</span>
          Tambah Wali Kelas
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-secondary-container/30 border border-secondary/20 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5 shrink-0">info</span>
        <div className="text-sm text-on-surface-variant leading-relaxed">
          <p className="m-0 font-medium text-on-surface">Cara menetapkan wali kelas ke kelas:</p>
          <p className="m-0 mt-1">Setelah menambahkan akun wali kelas di sini, buka menu <strong>Master Kelas</strong> → Edit kelas yang diinginkan → Pilih nama wali kelas dari dropdown <em>"Akun Wali Kelas"</em>.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined text-secondary text-5xl animate-spin">progress_activity</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Nama Wali Kelas</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Email / Username Login</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold text-center">Role</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {teachers.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-secondary text-[20px]">school</span>
                      </div>
                      <span className="font-body-md text-on-surface font-bold">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-body-md text-on-surface-variant">{u.email}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-tertiary-container text-on-tertiary-container uppercase tracking-wider">
                      Wali Kelas
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenModal(u)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(u)} className="p-2 rounded-lg hover:bg-error-container/50 text-on-surface-variant hover:text-error transition-colors" title="Hapus">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl opacity-30">school</span>
                      <p className="font-body-md italic m-0">Belum ada akun wali kelas.</p>
                      <button onClick={() => handleOpenModal()} className="text-primary font-medium text-sm hover:underline">
                        + Tambah Wali Kelas Pertama
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">school</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-on-surface m-0">{editingUser ? 'Edit Wali Kelas' : 'Tambah Wali Kelas Baru'}</h3>
                  <p className="text-xs text-on-surface-variant m-0">Role akses: Wali Kelas</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant">Nama Lengkap</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="cth: Bpk. Budi Santoso, S.Pd"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant">Email (untuk Login)</label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="cth: budi@smktiglobal.sch.id"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant">
                  {editingUser ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password'}
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  required={!editingUser}
                  placeholder={editingUser ? 'Biarkan kosong jika tidak diubah' : 'Minimal 8 karakter'}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:bg-on-background transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun Wali Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
