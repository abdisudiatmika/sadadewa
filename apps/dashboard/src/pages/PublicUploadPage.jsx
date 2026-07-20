import { useState } from 'react';

export default function PublicUploadPage() {
  const [formData, setFormData] = useState({
    studentName: '',
    className: '',
    accountOwner: '',
    destinationBank: '',
    amount: '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, amount: rawValue });
  };

  const formatRupiahString = (val) => {
    if (!val) return '';
    return Number(val).toLocaleString('id-ID');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!file) {
      setError('Silakan unggah foto bukti transfer.');
      return;
    }

    setLoading(true);

    const data = new FormData();
    data.append('studentName', formData.studentName);
    data.append('className', formData.className);
    data.append('accountOwner', formData.accountOwner);
    data.append('destinationBank', formData.destinationBank);
    data.append('amount', formData.amount);
    data.append('notes', formData.notes);
    data.append('file', file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/public/upload-proof`, {
        method: 'POST',
        body: data,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Terjadi kesalahan saat mengunggah');
      }

      setSuccess(true);
      setFormData({
        studentName: '',
        className: '',
        accountOwner: '',
        destinationBank: '',
        amount: '',
        notes: '',
      });
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-container flex flex-col items-center justify-center p-6">
        <div className="bg-surface p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-outline-variant">
          <span className="material-symbols-outlined text-green-600 text-6xl mb-4 block">check_circle</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Upload Berhasil!</h2>
          <p className="text-on-surface-variant mb-6">Bukti transfer Anda telah berhasil dikirim dan akan segera diverifikasi oleh tim kami.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="w-full bg-secondary text-on-secondary py-3 rounded-lg font-bold hover:bg-secondary/90 transition-colors"
          >
            Upload Bukti Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md bg-surface p-6 sm:p-8 rounded-3xl shadow-sm border border-outline-variant">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-4 object-contain" onError={(e) => e.target.style.display='none'} />
          <h1 className="text-2xl font-bold text-on-surface">Upload Bukti Transfer</h1>
          <p className="text-on-surface-variant text-sm mt-2">Silakan isi formulir di bawah ini untuk melaporkan pembayaran.</p>
        </div>

        {error && (
          <div className="bg-error-container text-error p-4 rounded-xl mb-6 text-sm flex gap-2 items-start">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Nama Lengkap Siswa <span className="text-error">*</span></label>
            <input 
              type="text" 
              name="studentName"
              required
              value={formData.studentName}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-secondary transition-colors"
              placeholder="Contoh: Budi Santoso"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Kelas <span className="text-error">*</span></label>
            <input 
              type="text" 
              name="className"
              required
              value={formData.className}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-secondary transition-colors"
              placeholder="Contoh: X RPL 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Nominal Transfer (Rp) <span className="text-error">*</span></label>
            <input 
              type="text" 
              name="amount"
              required
              value={formatRupiahString(formData.amount)}
              onChange={handleAmountChange}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-secondary transition-colors"
              placeholder="Contoh: 150.000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Nama Pemilik Rekening (Pengirim) <span className="text-error">*</span></label>
            <input 
              type="text" 
              name="accountOwner"
              required
              value={formData.accountOwner}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-secondary transition-colors"
              placeholder="Contoh: Agus Santoso"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Bank Tujuan Transfer <span className="text-error">*</span></label>
            <select 
              name="destinationBank"
              required
              value={formData.destinationBank}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-secondary transition-colors"
            >
              <option value="" disabled>Pilih Bank Tujuan</option>
              <option value="BRI">Bank BRI</option>
              <option value="Bukopin">Bank Bukopin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Keterangan / Berita Acara (Opsional)</label>
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-secondary transition-colors resize-none"
              placeholder="Contoh: SPP Bulan Mei"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Foto Bukti Transfer <span className="text-error">*</span></label>
            <div className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center hover:bg-surface-container transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-3xl">image</span>
                  <span className="text-sm text-on-surface font-medium truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-on-surface-variant">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-4xl mb-1">cloud_upload</span>
                  <span className="text-sm font-medium text-primary">Klik atau Tap untuk memilih foto</span>
                  <span className="text-xs text-on-surface-variant">Maksimal ukuran 5MB</span>
                </div>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Mengunggah...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">send</span>
                Kirim Bukti Pembayaran
              </>
            )}
          </button>
        </form>
      </div>
      
      <p className="text-xs text-on-surface-variant mt-8 text-center max-w-sm">
        Jika mengalami kendala saat mengunggah bukti transfer, silakan hubungi Tata Usaha sekolah.
      </p>
    </div>
  );
}
