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

export default function ReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTransaction(id)
      .then(res => setTransaction(res.data))
      .catch(err => alert(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Automatically trigger print dialogue when page loads
  useEffect(() => {
    if (transaction) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [transaction]);

  if (loading) return <div className="p-8">Loading receipt...</div>;
  if (!transaction) return <div className="p-8">Receipt not found. <button onClick={() => navigate('/pos')} className="underline text-blue-500 ml-2">Back to POS</button></div>;

  const terbilangText = terbilang(transaction.total).trim() + ' Rupiah';
  
  // Group fees by name to prevent too long strings if they pay 12 months at once
  const feeMap = {};
  transaction.items.forEach(item => {
    const name = item.billingItem?.feeTemplate?.name || 'Tagihan';
    feeMap[name] = (feeMap[name] || 0) + 1;
  });
  
  const feeNames = Object.entries(feeMap).map(([name, count]) => {
    return count > 1 ? `${name} (${count}x)` : name;
  }).join(', ');

  // Fix for "Local time stored as UTC" bug: strip 'Z' to treat as local
  const dateObj = new Date(transaction.createdAt.replace('Z', ''));
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

      {/* A5 Landscape container */}
      <div className="bg-white w-[210mm] min-h-[148mm] shadow-lg p-8 print:p-6 relative print:shadow-none print:w-[210mm] print:min-h-[148mm] print:h-auto print:border-none border border-outline-variant font-sans text-black mx-auto" style={{ color: 'black' }}>
        
        {/* Header */}
        <div className="flex items-center border-b-[3px] border-black pb-2 mb-3">
          <div className="w-20 h-20 mr-4 shrink-0 flex items-center justify-center">
             <img 
               src="/logo.png" 
               alt="Logo" 
               className="max-w-full max-h-full object-contain"
               onError={(e) => {
                 e.target.onerror = null;
                 e.target.style.display = 'none';
                 e.target.parentNode.innerHTML = '<div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-xs text-center border-2 border-gray-400">LOGO<br/>(Taruh logo.png di folder public)</div>';
               }}
             />
          </div>
          <div className="text-center flex-1 pr-24">
             <h1 className="text-3xl font-black uppercase tracking-widest text-black mb-1">SMK TI Bali Global</h1>
             <p className="text-sm font-medium">Jl. Raya Kampus Udayana, Kuta Selatan, Jimbaran, Badung - Bali</p>
             <p className="text-sm font-medium">SMS Centre: 0822 - 3707 - 0017 / 0812 - 8877 - 8840</p>
             <p className="text-sm font-medium">email: smktibg.jimbaran@gmail.com</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4 relative">
          <h2 className="text-xl font-bold uppercase underline inline-block tracking-wider">Kwitansi</h2>
          <p className="text-base font-bold tracking-wide">No. {transaction.transactionCode.replace('TRX-', '')}</p>
        </div>

        {/* Body Fields */}
        <div className="space-y-4 text-[14px] px-4">
          <div className="flex items-end">
            <div className="w-48 font-semibold">Sudah terima dari</div>
            <div className="w-4 text-center">:</div>
            <div className="flex-1 border-b-2 border-gray-800 font-bold uppercase text-lg px-2 pb-1">{transaction.student?.fullName}</div>
          </div>
          
          <div className="flex items-center">
            <div className="w-48 font-semibold pt-2">Banyaknya uang</div>
            <div className="w-4 text-center pt-2">:</div>
            <div className="flex-1 font-bold italic px-4 py-2 border-y-2 border-gray-800 min-h-[44px] flex items-center ml-2 bg-gray-100" style={{"clipPath": "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0% 100%)", WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'}}>
              {terbilangText}
            </div>
          </div>

          <div className="flex items-end">
            <div className="w-48 font-semibold">Untuk pembayaran</div>
            <div className="w-4 text-center">:</div>
            <div className="flex-1 border-b-2 border-gray-800 font-semibold px-2 pb-1 leading-relaxed">
              {feeNames}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-6 flex justify-between items-end px-4">
          {/* Note Box */}
          <div className="flex flex-col gap-5">
             <div className="border-2 border-gray-800 p-2 text-[11px] w-64 uppercase font-bold leading-tight">
               Catatan:<br/>
               Biaya yang telah dibayar<br/>
               tidak dapat dikembalikan
             </div>
             
             {/* Total amount box */}
             <div className="flex items-center text-lg font-bold mt-2">
               <span className="mr-4 tracking-wider">Jumlah Rp.</span>
               <div className="border-y-2 border-gray-800 min-w-[180px] px-4 py-1 bg-gray-100 text-center text-xl tracking-widest" style={{"clipPath": "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0% 100%)", WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'}}>
                  {transaction.total.toLocaleString('id-ID')}
               </div>
             </div>
          </div>

          {/* Signature */}
          <div className="text-center w-56 mr-4">
            <p className="mb-12 font-medium text-base">Jimbaran, {dateFormatted}</p>
            <p className="border-b-2 border-gray-800 w-full mx-auto font-bold uppercase tracking-wide">{transaction.cashier?.name}</p>
            <p className="mt-1 text-sm font-medium">Penerima</p>
          </div>
        </div>

      </div>
      
      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A5 landscape; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}
