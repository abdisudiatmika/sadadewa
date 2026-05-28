import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

function terbilang(angka) {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];
  if (angka < 12) {
    return bilangan[angka];
  } else if (angka < 20) {
    return terbilang(angka - 10) + ' Belas';
  } else if (angka < 100) {
    return terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
  } else if (angka < 200) {
    return 'Seratus ' + terbilang(angka - 100);
  } else if (angka < 1000) {
    return terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
  } else if (angka < 2000) {
    return 'Seribu ' + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
  }
  return '';
}

export default function ReceiptIncomePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getIncome(id)
      .then(res => setIncome(res.data))
      .catch(err => alert(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Automatically trigger print dialogue when page loads
  useEffect(() => {
    if (income) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [income]);

  if (loading) return <div className="p-8">Loading receipt...</div>;
  if (!income) return <div className="p-8">Receipt not found. <button onClick={() => navigate('/pos')} className="underline text-blue-500 ml-2">Back to POS</button></div>;

  const terbilangText = terbilang(income.amount).trim() + ' Rupiah';
  
  // Fix for "Local time stored as UTC" bug: strip 'Z' to treat as local
  const dateObj = new Date(income.date.replace('Z', ''));
  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateObj);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-surface-container p-8 flex flex-col items-center print:p-0 print:bg-white">
      <div className="mb-4 print:hidden flex gap-4">
        <button onClick={() => window.close()} className="px-4 py-2 bg-surface rounded-lg shadow-sm border border-outline-variant font-label-lg font-medium text-on-surface hover:bg-surface-container">
          Tutup
        </button>
        <button onClick={handlePrint} className="px-4 py-2 bg-[#0D9488] text-white rounded-lg shadow-sm font-label-lg font-medium flex items-center gap-2 hover:bg-[#0F766E]">
          <span className="material-symbols-outlined text-[18px]">print</span> Cetak / Simpan PDF
        </button>
      </div>

      {/* A5 (Half A4) container */}
      <div className="bg-white w-[210mm] h-[148mm] overflow-hidden shadow-lg p-6 print:p-4 relative print:shadow-none print:w-[210mm] print:h-[148mm] print:border-none border border-outline-variant font-sans text-black mx-auto flex flex-col" style={{ color: 'black' }}>
        
        {/* Header */}
        <div className="flex items-center border-b-[2px] border-black pb-2 mb-2">
          <div className="w-16 h-16 mr-3 shrink-0 flex items-center justify-center">
             <img 
               src="/logo.png" 
               alt="Logo" 
               className="max-w-full max-h-full object-contain"
               onError={(e) => {
                 e.target.onerror = null;
                 e.target.style.display = 'none';
                 e.target.parentNode.innerHTML = '<div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-[10px] text-center border border-gray-400">LOGO</div>';
               }}
             />
          </div>
          <div className="text-center flex-1 pr-16">
             <h1 className="text-xl font-black uppercase tracking-widest text-black mb-0.5">SMK TI Bali Global</h1>
             <p className="text-[11px] font-medium leading-tight">Jl. Raya Kampus Udayana, Kuta Selatan, Jimbaran, Badung - Bali</p>
             <p className="text-[11px] font-medium leading-tight">SMS Centre: 0822 - 3707 - 0017 / 0812 - 8877 - 8840</p>
             <p className="text-[11px] font-medium leading-tight">email: smktibg.jimbaran@gmail.com</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-3 relative">
          <h2 className="text-lg font-bold uppercase underline inline-block tracking-wider">Kwitansi Pemasukan</h2>
          <p className="text-sm font-bold tracking-wide">No. {income.incomeCode.replace('INC-', '')}</p>
        </div>

        {/* Body Fields */}
        <div className="space-y-3 text-[12px] px-2 flex-1">
          <div className="flex items-end">
            <div className="w-36 font-semibold">Sudah terima dari</div>
            <div className="w-4 text-center">:</div>
            <div className="flex-1 border-b-[1.5px] border-gray-800 font-bold uppercase text-sm px-2 pb-0.5">{income.source}</div>
          </div>
          
          <div className="flex items-center">
            <div className="w-36 font-semibold pt-1">Banyaknya uang</div>
            <div className="w-4 text-center pt-1">:</div>
            <div className="flex-1 font-bold italic px-3 py-1 border-y-[1.5px] border-gray-800 min-h-[36px] flex items-center ml-2 bg-gray-100" style={{"clipPath": "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0% 100%)", WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'}}>
              {terbilangText}
            </div>
          </div>

          <div className="flex items-end">
            <div className="w-36 font-semibold">Untuk pembayaran</div>
            <div className="w-4 text-center">:</div>
            <div className="flex-1 border-b-[1.5px] border-gray-800 font-semibold px-2 pb-0.5 leading-tight text-[11px]">
              {income.category} {income.description ? `- ${income.description}` : ''}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-4 flex justify-between items-end px-2">
          {/* Note Box */}
          <div className="flex flex-col gap-3">
             <div className="border-[1.5px] border-gray-800 p-1.5 text-[10px] w-56 uppercase font-bold leading-tight">
               Catatan:<br/>
               Biaya yang telah dibayar<br/>
               tidak dapat dikembalikan
             </div>
             
             {/* Total amount box */}
             <div className="flex items-center text-base font-bold mt-1">
               <span className="mr-3 tracking-wide">Jumlah Rp.</span>
               <div className="border-y-[1.5px] border-gray-800 min-w-[140px] px-3 py-1 bg-gray-100 text-center text-lg tracking-wider" style={{"clipPath": "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0% 100%)", WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'}}>
                  {income.amount.toLocaleString('id-ID')}
               </div>
             </div>
          </div>

          {/* Signature */}
          <div className="text-center w-48 mr-2">
            <p className="mb-10 font-medium text-[12px]">Jimbaran, {dateFormatted}</p>
            <p className="border-b-[1.5px] border-gray-800 w-full mx-auto font-bold uppercase tracking-wide text-[13px]">{income.recordedByAdmin?.name || 'Kasir'}</p>
            <p className="mt-1 text-[11px] font-medium">Penerima</p>
          </div>
        </div>

        {/* Cut line for printing */}
        <div className="absolute bottom-0 left-0 w-full hidden print:flex items-center opacity-60">
          <span className="material-symbols-outlined text-[14px] ml-4 -mr-1 text-black bg-white z-10">content_cut</span>
          <div className="flex-1 border-b border-dashed border-black"></div>
        </div>

      </div>
      
      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}
