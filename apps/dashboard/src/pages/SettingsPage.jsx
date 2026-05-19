import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AcademicYearModal from '../components/settings/AcademicYearModal';

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ theme: 'light', font_size: 'default', brand_color: '#006a61' });
  const [profileName, setProfileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [academicYears, setAcademicYears] = useState([]);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);

  useEffect(() => {
    api.getSettings()
      .then(res => {
        if (res.data) setSettings(prev => ({ ...prev, ...res.data }));
      })
      .catch(console.error);

    api.getAcademicYears()
      .then(res => {
        if (res.data) setAcademicYears(res.data);
      })
      .catch(console.error);

    if (user) setProfileName(user.name || '');
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.updateSettings(settings);
      if (profileName !== user?.name) {
        await api.updateProfile({ name: profileName });
      }
      setMessage('✅ Settings saved successfully!');
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults?')) return;
    try {
      const res = await api.resetSettings();
      setSettings(res.data || {});
      setMessage('Settings reset to defaults');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveAcademicYear = async (data) => {
    try {
      if (editingYear) {
        await api.updateAcademicYear(editingYear.id, data);
        setMessage('✅ Tahun Ajaran berhasil diperbarui!');
      } else {
        await api.createAcademicYear(data);
        setMessage('✅ Tahun Ajaran berhasil ditambahkan!');
      }
      setIsYearModalOpen(false);
      setEditingYear(null);
      // Refresh list
      const res = await api.getAcademicYears();
      setAcademicYears(res.data);
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleActivateYear = async (id) => {
    try {
      await api.activateAcademicYear(id);
      setMessage('✅ Tahun Ajaran aktif berhasil diubah!');
      // Refresh list
      const res = await api.getAcademicYears();
      setAcademicYears(res.data);
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteYear = async (id) => {
    if (!confirm('Yakin ingin menghapus Tahun Ajaran ini?')) return;
    try {
      await api.deleteAcademicYear(id);
      setMessage('✅ Tahun Ajaran dihapus');
      const res = await api.getAcademicYears();
      setAcademicYears(res.data);
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="mb-8 mt-2">
        <h2 className="font-display text-display text-on-surface m-0">Pengaturan Sistem</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 m-0">Manage your administrative preferences, visual appearance, and security settings.</p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg font-body-md ${message.startsWith('✅') || message.startsWith('Settings') ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
          {message}
        </div>
      )}

      {/* Settings Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-card-gap">
        {/* Main Settings Column */}
        <div className="lg:col-span-2 space-y-card-gap">
          
          {/* Academic Year Management */}
          <section className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">calendar_month</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface m-0">Tahun Ajaran</h3>
              </div>
              <button
                onClick={() => { setEditingYear(null); setIsYearModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-label-lg hover:bg-secondary hover:text-on-secondary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Tambah
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-lowest border-b border-outline-variant">
                  <tr>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant font-medium">Nama</th>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant font-medium">Periode</th>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {academicYears.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-on-surface-variant font-body-md">
                        Belum ada data Tahun Ajaran.
                      </td>
                    </tr>
                  ) : (
                    academicYears.map((year) => (
                      <tr key={year.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="px-6 py-4 font-body-md text-on-surface font-medium">{year.name}</td>
                        <td className="px-6 py-4 font-body-sm text-on-surface-variant">
                          {new Date(year.startDate).toLocaleDateString('id-ID')} - {new Date(year.endDate).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {year.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-tertiary-container text-on-tertiary-container rounded-md text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span>
                              AKTIF
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleActivateYear(year.id)}
                              className="px-3 py-1 border border-outline-variant text-on-surface-variant rounded-md text-[11px] font-medium hover:border-secondary hover:text-secondary transition-colors"
                            >
                              Jadikan Aktif
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setEditingYear(year); setIsYearModalOpen(true); }}
                              className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary-container/20 rounded-md transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            {!year.isActive && (
                              <button
                                onClick={() => handleDeleteYear(year.id)}
                                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-md transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Theme Selection */}
          <section className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-secondary text-[24px]">palette</span>
              <h3 className="font-headline-lg text-headline-lg text-on-surface m-0">Theme Selection</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['light', 'dark', 'auto'].map(t => (
                <label key={t} className={`cursor-pointer group relative rounded-lg border-2 p-4 text-center ${settings.theme === t ? 'border-secondary bg-surface-container-lowest' : 'border-outline-variant bg-surface-container-lowest hover:border-secondary'} transition-all`}>
                  <input type="radio" name="theme" className="hidden" checked={settings.theme === t} onChange={() => setSettings(s => ({ ...s, theme: t }))} />
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2 block">
                    {t === 'light' ? 'light_mode' : t === 'dark' ? 'dark_mode' : 'contrast'}
                  </span>
                  <span className="font-body-md text-body-md text-on-surface capitalize">{t === 'auto' ? 'Auto (System)' : t}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Font Size */}
          <section className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-secondary text-[24px]">text_fields</span>
              <h3 className="font-headline-lg text-headline-lg text-on-surface m-0">Font Size</h3>
            </div>
            <div className="flex gap-4">
              {['small', 'default', 'large'].map(size => (
                <label key={size} className={`cursor-pointer flex-1 p-4 rounded-lg border-2 text-center ${settings.font_size === size ? 'border-secondary bg-secondary-container/20' : 'border-outline-variant hover:border-secondary'} transition-all`}>
                  <input type="radio" name="fontSize" className="hidden" checked={settings.font_size === size} onChange={() => setSettings(s => ({ ...s, font_size: size }))} />
                  <span className={`block font-medium text-on-surface ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-xl' : 'text-base'}`}>Aa</span>
                  <span className="text-on-surface-variant text-sm capitalize mt-1 block">{size}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar — Profile */}
        <div className="space-y-card-gap">
          <section className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-secondary text-[24px]">person</span>
              <h3 className="font-headline-lg text-headline-lg text-on-surface m-0">Profile</h3>
            </div>
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-2xl mb-3 border-2 border-secondary">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
              </div>
              <p className="font-body-md text-on-surface-variant m-0">{user?.email}</p>
              <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded text-[11px] font-medium mt-1 capitalize">{user?.role}</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Display Name</label>
                <input
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Email</label>
                <input
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-on-surface-variant cursor-not-allowed"
                  value={user?.email || ''}
                  disabled
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-secondary text-on-secondary rounded-lg font-headline-md text-headline-md hover:bg-on-secondary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Saving...</>
              ) : (
                <><span className="material-symbols-outlined">save</span> Save Changes</>
              )}
            </button>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-surface border border-outline-variant text-on-surface rounded-lg font-body-md hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">restart_alt</span>
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AcademicYearModal
        isOpen={isYearModalOpen}
        onClose={() => { setIsYearModalOpen(false); setEditingYear(null); }}
        onSave={handleSaveAcademicYear}
        initialData={editingYear}
      />
    </div>
  );
}
