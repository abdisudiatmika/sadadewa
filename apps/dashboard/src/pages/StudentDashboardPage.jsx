import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function StudentDashboardPage() {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
      return;
    }
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      await api.updateProfile({ password: passwordForm.new });
      setMsg({ type: 'success', text: 'Password berhasil diperbarui!' });
      setPasswordForm({ old: '', new: '', confirm: '' });
      setTimeout(() => setShowSettings(false), 2000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Gagal update password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background text-on-background antialiased min-h-screen pb-[80px] max-w-md mx-auto relative shadow-2xl border-x border-outline-variant bg-surface-bright">
      {/* Header Section */}
      <header className="bg-surface-container-lowest px-container-padding py-container-padding sticky top-0 z-40 border-b border-outline-variant">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-gutter">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 text-primary">
              <span className="material-symbols-outlined text-3xl">account_circle</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md text-on-surface m-0 leading-tight">{user?.name || 'Student'}</h1>
              <p className="font-body-md text-body-md text-on-surface-variant m-0">NISN: {user?.email?.split('@')[0] || '-'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button 
              onClick={logout}
              className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center text-error hover:bg-error-container/40 transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-container-padding flex flex-col gap-container-padding">
        {/* Total Tunggakan Summary Card */}
        <section className="bg-primary text-on-primary rounded-xl p-container-padding shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col gap-unit">
            <h2 className="font-body-lg text-body-lg text-on-primary/80 m-0">Total Tunggakan</h2>
            <div className="font-display text-display flex items-baseline gap-unit m-0 mt-1">
              <span className="text-2xl font-bold">Rp</span>
              <span>1.450.000</span>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-error-container" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <p className="font-label-md text-label-md text-error-container m-0">2 Bulan Belum Dibayar</p>
            </div>
          </div>
        </section>

        {/* Payment Timeline */}
        <section className="flex flex-col gap-gutter">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface m-0">Tagihan SPP</h3>
            <span className="font-label-md text-label-md text-secondary bg-secondary-container px-3 py-1 rounded-full">Tahun Ajaran Aktif</span>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-container-padding">
            <div className="relative pl-6 space-y-6">
              <div className="absolute left-[31px] top-4 bottom-4 w-px bg-outline-variant"></div>

              {/* Static Mock Data for now - should be replaced with real API call later */}
              <div className="relative flex items-center gap-gutter">
                <div className="absolute left-[-15px] w-4 h-4 rounded-full bg-secondary ring-4 ring-surface-container-lowest flex items-center justify-center z-10">
                  <span className="material-symbols-outlined text-[10px] text-on-secondary font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
                <div className="flex-1 bg-surface rounded-lg p-4 border border-outline-variant flex justify-between items-center">
                  <div>
                    <h4 className="font-headline-md text-[16px] text-on-surface m-0">Januari 2024</h4>
                    <p className="font-label-md text-label-md text-secondary m-0 mt-1">Lunas</p>
                  </div>
                  <div className="font-tabular-nums text-on-surface-variant">Rp 725.000</div>
                </div>
              </div>

              <div className="relative flex items-center gap-gutter">
                <div className="absolute left-[-15px] w-4 h-4 rounded-full bg-error ring-4 ring-surface-container-lowest flex items-center justify-center z-10">
                  <span className="material-symbols-outlined text-[10px] text-on-error font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
                </div>
                <div className="flex-1 bg-error-container rounded-lg p-4 border border-error flex justify-between items-center">
                  <div>
                    <h4 className="font-headline-md text-[16px] text-on-error-container m-0">Februari 2024</h4>
                    <p className="font-label-md text-label-md text-error m-0 mt-1 font-bold">Menunggak</p>
                  </div>
                  <div className="font-tabular-nums text-error font-bold">Rp 725.000</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Area */}
        <section className="mt-4">
          <button className="w-full bg-secondary text-on-secondary font-headline-md text-headline-md py-4 rounded-xl shadow-sm hover:bg-[#005a52] transition-all flex justify-center items-center gap-2">
            <span className="material-symbols-outlined">payments</span>
            Detail Tagihan
          </button>
        </section>
      </main>

      {/* Settings / Password Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-md text-on-surface m-0">Pengaturan Akun</h3>
              <button onClick={() => setShowSettings(false)} className="text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              {msg.text && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                  <span className="material-symbols-outlined text-[18px]">{msg.type === 'error' ? 'error' : 'check_circle'}</span>
                  {msg.text}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant uppercase tracking-wider text-[10px] font-bold">Password Baru</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-all"
                  value={passwordForm.new}
                  onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant uppercase tracking-wider text-[10px] font-bold">Konfirmasi Password Baru</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-all"
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                  required
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-4 bg-primary text-on-primary rounded-xl font-headline-md font-bold hover:bg-on-background transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {saving && <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>}
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
