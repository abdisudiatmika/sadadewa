import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatRupiah(value) {
  const num = Number(value || 0);
  return `Rp ${num.toLocaleString('id-ID')}`;
}

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [billingItems, setBillingItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [topArrears, setTopArrears] = useState([]);
  const searchRef = useRef(null);

  // Load top arrears initially
  useEffect(() => {
    api.getTopArrears(15)
      .then(res => setTopArrears(res.data || []))
      .catch(console.error);
  }, []);

  // Search students
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchStudents(searchQuery);
        setSearchResults(res.data || []);
        setShowResults(true);
      } catch (err) { console.error(err); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load billing when student is selected
  useEffect(() => {
    if (!selectedStudent) return;
    api.getStudentBilling(selectedStudent.id)
      .then(res => {
        setBillingItems(res.data || []);
        setCart([]);
        setDiscount(null);
      })
      .catch(console.error);
  }, [selectedStudent]);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setShowResults(false);
  };

  const toggleCartItem = (item) => {
    if (item.status === 'paid') return;
    setCart(prev => {
      const exists = prev.find(c => c.id === item.id);
      return exists ? prev.filter(c => c.id !== item.id) : [...prev, item];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const applyDiscount = async () => {
    if (!discountCode) return;
    try {
      const res = await api.validateDiscount(discountCode);
      setDiscount(res.data);
    } catch (err) {
      alert('Kode diskon tidak valid: ' + err.message);
      setDiscount(null);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + Number(item.amount), 0);
  const overdueCount = cart.filter(i => i.status === 'overdue').length;
  const lateFees = overdueCount * 25000;
  
  let discountAmount = 0;
  if (discount) {
    discountAmount = discount.type === 'percentage'
      ? Math.round(subtotal * discount.value / 100)
      : discount.value;
  }
  const total = subtotal + lateFees - discountAmount;

  const totalOutstanding = billingItems
    .filter(b => b.status === 'overdue' || b.status === 'unpaid')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedStudent) return;
    setProcessing(true);
    try {
      const checkoutRes = await api.checkout({
        studentId: selectedStudent.id,
        billingItemIds: cart.map(c => c.id),
        paymentMethod: 'cash',
        discountCode: discount ? discountCode : undefined,
      });
      
      // Open receipt in new tab
      window.open(`/receipt/${checkoutRes.data.transactionId}`, '_blank');
      
      // Reload billing
      const res = await api.getStudentBilling(selectedStudent.id);
      setBillingItems(res.data || []);
      setCart([]);
      setDiscount(null);
      setDiscountCode('');
    } catch (err) {
      alert('❌ Pembayaran gagal: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'paid') return { border: 'border-outline-variant opacity-70', bg: 'bg-surface-container-lowest', icon: 'check_circle', iconColor: 'text-secondary', label: 'Lunas', labelStyle: 'text-secondary bg-secondary-container' };
    if (status === 'overdue') return { border: 'border-error/20 ring-2 ring-error/30', bg: 'bg-error-container', icon: 'warning', iconColor: 'text-error', label: 'Tunggakan', labelStyle: 'text-on-error bg-error' };
    return { border: 'border-outline-variant hover:border-secondary', bg: 'bg-surface-container-lowest', icon: null, iconColor: '', label: 'Belum Bayar', labelStyle: 'text-on-surface-variant bg-surface-container' };
  };

  return (
    <div className="flex-1 flex w-full h-full overflow-hidden flex-row">
      {/* Left Side: Selection & Status (60%) */}
      <section className="w-[60%] flex flex-col p-container-padding gap-6 overflow-y-auto">
        {/* Search & Student Context */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
          <div className="relative w-full max-w-md mb-6" ref={searchRef}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary transition-colors"
              placeholder="Cari NISN, Nama, atau Kelas..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {/* Search Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {searchResults.map(s => (
                  <button
                    key={s.id}
                    className="w-full px-4 py-3 text-left hover:bg-surface-container-low transition-colors flex items-center gap-3 border-b border-outline-variant last:border-0"
                    onClick={() => selectStudent(s)}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-sm">
                      {s.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-body-md text-on-surface font-medium m-0">{s.fullName}</p>
                      <p className="font-label-md text-on-surface-variant m-0">{s.studentCode} • {s.grade?.name || ''} {s.class?.name || ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Student Snapshot */}
          {selectedStudent ? (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant text-headline-md font-bold">
                  {selectedStudent.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-background m-0">{selectedStudent.fullName}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant m-0 mt-1">
                    {selectedStudent.grade?.name || ''} {selectedStudent.class?.name || ''} • NISN: {selectedStudent.nisn}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider m-0 mb-1">Total Tunggakan</p>
                <p className="font-headline-lg text-headline-lg text-error font-bold font-tabular-nums m-0">{formatRupiah(totalOutstanding)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-title-md text-on-surface m-0">Top 15 Penunggak Terbesar</h3>
                <span className="font-label-md text-on-surface-variant bg-surface-container px-2 py-1 rounded-md">Urut berdasarkan jumlah terbesar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {topArrears.map(s => (
                  <button
                    key={s.studentId}
                    onClick={() => {
                      api.getStudent(s.studentId).then(res => selectStudent(res.data)).catch(console.error);
                    }}
                    className="flex flex-col p-4 bg-surface border border-outline-variant rounded-xl hover:bg-surface-container hover:border-error/50 transition-all text-left group shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-on-error-container font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
                        {s.initials}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-body-sm text-on-surface font-bold m-0 truncate">{s.studentName}</p>
                        <p className="font-label-sm text-on-surface-variant m-0 truncate">{s.className}</p>
                      </div>
                    </div>
                    <div className="mt-auto pt-2 border-t border-outline-variant/30 flex justify-between items-center">
                      <span className="font-label-sm text-on-surface-variant">Tunggakan:</span>
                      <span className="font-tabular-nums text-tabular-nums text-error font-bold">{formatRupiah(s.totalArrears)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 12-Month Grid */}
        {selectedStudent && billingItems.length > 0 && (
          <>
            <div className="flex justify-between items-end">
              <h3 className="font-headline-md text-headline-md text-on-background m-0">Item Tagihan</h3>
            </div>
            <div className="grid grid-cols-4 gap-4 pb-8">
              {billingItems.map(item => {
                const style = getStatusStyle(item.status);
                const isInCart = cart.some(c => c.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCartItem(item)}
                    className={`${style.bg} border ${style.border} rounded-xl p-4 flex flex-col justify-between h-32 cursor-pointer transition-all relative ${
                      isInCart ? 'border-2 !border-secondary shadow-md' : ''
                    } ${item.status === 'paid' ? 'pointer-events-none' : 'hover:shadow-sm'}`}
                  >
                    {isInCart && (
                      <span className="absolute -top-2 -right-2 bg-secondary text-on-secondary rounded-full p-1 shadow-sm flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </span>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="overflow-hidden">
                        <span className="font-headline-sm text-headline-sm text-on-background block truncate" title={item.feeTemplate?.name || 'Tagihan'}>
                          {item.feeTemplate?.name || 'Tagihan'}
                        </span>
                        <span className="font-body-md text-on-surface-variant block mt-0.5">
                          {monthNames[item.billingMonth] ? `${monthNames[item.billingMonth]} ${item.billingYear}` : item.billingYear}
                        </span>
                      </div>
                      {style.icon && <span className={`material-symbols-outlined ${style.iconColor} icon-fill ml-2 shrink-0`}>{style.icon}</span>}
                    </div>
                    <div>
                      <p className={`font-label-md text-label-md ${style.labelStyle} inline-block px-2 py-1 rounded-md mb-1 mt-2`}>{style.label}</p>
                      <p className="font-tabular-nums text-tabular-nums text-on-surface-variant">{formatRupiah(item.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Right Side: Order Summary / Cart (40%) */}
      <section className="w-[40%] bg-surface-container-lowest border-l border-outline-variant flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 h-full">
        {/* Cart Header */}
        <div className="p-container-padding border-b border-surface-variant">
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-background flex items-center gap-2 m-0">
            <span className="material-symbols-outlined text-secondary">shopping_cart</span>
            Keranjang
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 mb-0">{cart.length} item terpilih</p>
        </div>

        {/* Selected Items List */}
        <div className="flex-1 overflow-y-auto p-container-padding flex flex-col gap-4">
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2 block">add_shopping_cart</span>
                <p className="font-body-md">Klik item tagihan untuk menambah ke keranjang</p>
              </div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center group">
                <div className="flex flex-col overflow-hidden mr-2">
                  <span className="font-body-lg text-body-lg text-on-background font-medium truncate" title={item.feeTemplate?.name || 'Tagihan'}>
                    {item.feeTemplate?.name || 'Tagihan'} {monthNames[item.billingMonth] ? `- ${monthNames[item.billingMonth]}` : ''}
                  </span>
                  <span className={`font-label-md text-label-md ${item.status === 'overdue' ? 'text-error' : 'text-on-surface-variant'}`}>
                    {item.status === 'overdue' ? 'Terlambat' : 'Lancar'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-tabular-nums text-tabular-nums text-on-background">{formatRupiah(item.amount)}</span>
                  <button
                    className="text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Footer */}
        {cart.length > 0 && (
          <div className="p-container-padding bg-surface border-t border-surface-variant">
            <div className="flex items-center justify-between mb-4">
              <span className="font-body-md text-body-md text-on-surface-variant">Kode diskon</span>
              <div className="flex w-1/2">
                <input
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-l-lg font-body-md text-body-md focus:outline-none focus:border-secondary uppercase"
                  placeholder="Contoh: BEASISWA"
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                />
                <button
                  className="bg-surface-variant text-on-surface-variant px-4 py-2 rounded-r-lg font-body-md hover:bg-surface-dim transition-colors border border-l-0 border-outline-variant"
                  onClick={applyDiscount}
                >
                  Gunakan
                </button>
              </div>
            </div>

            {discount && (
              <div className="flex justify-between mb-2 text-secondary">
                <span className="font-body-lg text-body-lg">Diskon ({discount.description})</span>
                <span className="font-tabular-nums text-tabular-nums">-{formatRupiah(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between mb-2">
              <span className="font-body-lg text-body-lg text-on-surface-variant">Subtotal ({cart.length} item)</span>
              <span className="font-tabular-nums text-tabular-nums text-on-background">{formatRupiah(subtotal)}</span>
            </div>
            {lateFees > 0 && (
              <div className="flex justify-between mb-6 pb-4 border-b border-surface-variant">
                <span className="font-body-lg text-body-lg text-on-surface-variant">Denda Keterlambatan ({overdueCount}x)</span>
                <span className="font-tabular-nums text-tabular-nums text-on-background">{formatRupiah(lateFees)}</span>
              </div>
            )}

            <div className="flex justify-between items-end mb-6">
              <span className="font-headline-lg text-headline-lg text-on-background">Total</span>
              <span className="font-display text-display text-primary font-bold font-tabular-nums tracking-tight">{formatRupiah(total)}</span>
            </div>

            <button
              className="w-full py-4 bg-secondary text-on-secondary rounded-xl font-headline-md text-headline-md flex items-center justify-center gap-2 hover:bg-on-secondary-fixed-variant transition-colors shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCheckout}
              disabled={processing}
            >
              {processing ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Memproses...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">print</span>
                  Bayar &amp; Cetak
                </>
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
