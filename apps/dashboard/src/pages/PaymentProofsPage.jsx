import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);
};

export default function PaymentProofsPage() {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchProofs();
  }, []);

  const fetchProofs = async () => {
    setLoading(true);
    try {
      // Create this method in api.js if it doesn't exist yet
      const res = await api.getPaymentProofs();
      setProofs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Yakin ingin mengubah status menjadi ${status}?`)) return;

    try {
      await api.updatePaymentProofStatus(id, status);
      alert(`Status berhasil diubah menjadi ${status}`);
      fetchProofs();
    } catch (err) {
      alert(`Gagal mengubah status: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface m-0">Verifikasi Bukti Transfer</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1 m-0">
            Daftar bukti transfer yang diunggah secara publik oleh orang tua/siswa.
          </p>
        </div>
        <button 
          onClick={fetchProofs}
          className="p-2 hover:bg-surface-container rounded-full text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Waktu Upload</th>
                <th className="text-left p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Siswa & Kelas</th>
                <th className="text-left p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Pengirim & Keterangan</th>
                <th className="text-right p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Nominal</th>
                <th className="text-center p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Bukti</th>
                <th className="text-center p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Status</th>
                <th className="text-center p-4 font-label-lg text-on-surface-variant border-b border-outline-variant">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center">
                    <span className="material-symbols-outlined animate-spin text-secondary text-4xl block mb-2">progress_activity</span>
                    <p className="text-on-surface-variant">Memuat data...</p>
                  </td>
                </tr>
              ) : proofs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl block mb-2 opacity-50">inbox</span>
                    <p>Belum ada bukti transfer yang diunggah.</p>
                  </td>
                </tr>
              ) : (
                proofs.map((proof) => (
                  <tr key={proof.id} className="hover:bg-surface-container-low transition-colors border-b border-outline-variant">
                    <td className="p-4 font-body-md text-on-surface">
                      {new Date(proof.createdAt).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-on-surface">{proof.studentName}</p>
                      <p className="text-sm text-on-surface-variant">{proof.className}</p>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="font-medium text-on-surface">A.n. {proof.accountOwner}</p>
                      {proof.destinationBank && <p className="text-sm font-bold text-secondary">Ke: Bank {proof.destinationBank}</p>}
                      {proof.notes && <p className="text-sm text-on-surface-variant truncate" title={proof.notes}>{proof.notes}</p>}
                    </td>
                    <td className="p-4 text-right font-bold text-primary">
                      {formatRupiah(proof.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedImage(`${import.meta.env.VITE_API_BASE || ''}${proof.fileUrl}`)}
                        className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded font-label-sm hover:bg-secondary-container-high transition-colors"
                      >
                        Lihat Foto
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md font-label-md capitalize ${getStatusBadge(proof.status)}`}>
                        {proof.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {proof.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(proof.id, 'verified')}
                            className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                            title="Setujui"
                          >
                            <span className="material-symbols-outlined text-[20px]">check</span>
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(proof.id, 'rejected')}
                            className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                            title="Tolak"
                          >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-on-surface-variant">
                          Oleh {proof.verifier?.name || 'Admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setSelectedImage(null)}>
          <div className="relative bg-surface rounded-xl p-2 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 z-10"
              onClick={() => setSelectedImage(null)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img src={selectedImage} alt="Bukti Transfer" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
