import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });

  const roles = [
    { id: 'superadmin', label: 'Superadmin' },
    { id: 'admin', label: 'Admin' },
    { id: 'bendahara_pemasukan', label: 'Bendahara Pemasukan' },
    { id: 'bendahara_pengeluaran', label: 'Bendahara Pengeluaran' },
    { id: 'teacher', label: 'Wali Kelas' },
    { id: 'staff', label: 'Staff Umum' },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        password: '', // Don't show password
        role: user.role
      });
    } else {
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'staff'
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        // Only send password if changed (though our backend logic for update doesn't handle pass yet)
        await api.updateUser(editingUser.id, {
          name: form.name,
          role: form.role,
          email: form.email
        });
      } else {
        await api.createUser(form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Hapus akun "${user.name}"?`)) return;
    try {
      await api.deleteUser(user.id);
      fetchUsers();
    } catch (err) {
      alert('Gagal menghapus user: ' + err.message);
    }
  };

  return (
    <div className="p-container-padding">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-1 m-0">User Management</h2>
          <p className="font-body-md text-body-md text-on-surface-variant m-0">Kelola akun dan hak akses staff sekolah.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-label-md text-label-md font-bold flex items-center gap-2 shadow-sm hover:bg-on-background transition-colors"
        >
          <span className="material-symbols-outlined">person_add</span>
          Tambah Akun
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined text-secondary text-5xl animate-spin">progress_activity</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Nama Lengkap</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Email / Username</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold">Role</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-4 px-6 font-body-md text-on-surface font-bold">{u.name}</td>
                  <td className="py-4 px-6 font-body-md text-on-surface-variant">{u.email}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      u.role === 'superadmin' ? 'bg-error-container text-on-error-container' :
                      u.role.includes('bendahara') ? 'bg-secondary-container text-on-secondary-container' :
                      'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {roles.find(r => r.id === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(u)}
                        className="p-2 rounded-lg hover:bg-error-container/50 text-on-surface-variant hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-on-surface-variant font-body-md italic">
                    Belum ada akun staff yang dibuat.
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
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container">
              <h3 className="font-headline-md text-on-surface m-0">{editingUser ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
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
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-all"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant">Email / Username</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-all"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  required
                />
              </div>

              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="font-label-md text-on-surface-variant">Password</label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-all"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant">Role Akses</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-all cursor-pointer"
                  value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:bg-on-background transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
