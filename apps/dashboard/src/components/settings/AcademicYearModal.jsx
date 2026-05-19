import { useState, useEffect } from 'react';

export default function AcademicYearModal({ isOpen, onClose, onSave, initialData }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setStartDate(initialData.startDate || '');
      setEndDate(initialData.endDate || '');
    } else {
      setName('');
      setStartDate('');
      setEndDate('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, startDate, endDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-display text-headline-sm text-on-surface m-0">
            {initialData ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block font-label-md text-on-surface-variant mb-1">Nama Tahun Ajaran</label>
            <input
              required
              placeholder="Contoh: 2026/2027"
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-on-surface-variant mb-1">Tanggal Mulai</label>
              <input
                required
                type="date"
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-label-md text-on-surface-variant mb-1">Tanggal Berakhir</label>
              <input
                required
                type="date"
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-label-lg text-on-surface hover:bg-surface-container transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-secondary text-on-secondary rounded-xl font-label-lg hover:bg-on-secondary-container transition-colors"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
