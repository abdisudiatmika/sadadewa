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
  const [useBalance, setUseBalance] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [saveChangeAsBalance, setSaveChangeAsBalance] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [topArrears, setTopArrears] = useState([]);
  
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const searchRef = useRef(null);

  // Income Modal States
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    source: '',
    category: '',
    amount: '',
    paymentMethod: 'cash',
    description: '',
  });
  const [savingIncome, setSavingIncome] = useState(false);

  // Top Up Modal States
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showEditSaldoModal, setShowEditSaldoModal] = useState(false);
  const [editSaldoAmount, setEditSaldoAmount] = useState('');
  const [topUpForm, setTopUpForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    notes: '',
  });
  const [savingTopUp, setSavingTopUp] = useState(false);

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
        setUseBalance(false);
        setCart([]);
        setAmountReceived('');
        setSaveChangeAsBalance(true);
      })
      .catch(console.error);
  }, [selectedStudent]);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setShowResults(false);
    setDiscountCode('');
    setDiscountInfo(null);
    setDiscountError('');
  };

  const toggleCartItem = (item) => {
    if (item.status === 'paid') return;
    setCart(prev => {
      const exists = prev.find(c => c.id === item.id);
      return exists ? prev.filter(c => c.id !== item.id) : [...prev, { ...item, amountToPay: item.amount - (item.paidAmount || 0) }];
    });
  };

  const updateCartItemAmount = (itemId, amount) => {
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, amountToPay: amount } : c));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const subtotal = cart.reduce((sum, item) => sum + Number(item.amountToPay || 0), 0);
  
  let discountAmount = 0;
  if (discountInfo) {
    if (discountInfo.type === 'percentage') {
      discountAmount = Math.floor(subtotal * (discountInfo.value / 100));
    } else {
      discountAmount = Math.min(subtotal, discountInfo.value);
    }
  }
  
  const total = subtotal - discountAmount;

  const handleValidateDiscount = async () => {
    setDiscountError('');
    setDiscountInfo(null);
    if (!discountCode.trim()) return;
    try {
      const res = await api.validateDiscount(discountCode);
      if (res.valid) {
        setDiscountInfo(res.discount);
      } else {
        setDiscountError(res.error || 'Kode tidak valid');
      }
    } catch (err) {
      setDiscountError(err.message || 'Gagal mengecek diskon');
    }
  };

  const totalOutstanding = billingItems
    .filter(b => b.status === 'overdue' || b.status === 'unpaid')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedStudent) return;
    setProcessing(true);
    try {
      const numAmountReceived = Number(amountReceived) || 0;
      const checkoutRes = await api.checkout({
        studentId: selectedStudent.id,
        payments: cart.map(c => ({ billingItemId: c.id, amount: Number(c.amountToPay) })),
        discountCode: discountInfo ? discountInfo.code : undefined,
        amountReceived: numAmountReceived > 0 ? numAmountReceived : undefined,
        saveToBalance: saveChangeAsBalance,
        paymentMethod: useBalance ? 'balance' : checkoutPaymentMethod,
      });
      
      // Open receipt in new tab
      window.open(`/receipt/${checkoutRes.data.transactionId}`, '_blank');
      
      // Reload billing
      const res = await api.getStudentBilling(selectedStudent.id);
      setBillingItems(res.data || []);
      setCart([]);
      setUseBalance(false);
      setAmountReceived('');
      
      // Update student balance info implicitly by re-fetching student (optional, we'll just reload the page or search)
      api.getStudent(selectedStudent.id).then(res => setSelectedStudent(res.data)).catch(console.error);
    } catch (err) {
      alert('❌ Pembayaran gagal: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'paid') return { border: 'border-outline-variant opacity-70', bg: 'bg-surface-container-lowest', icon: 'check_circle', iconColor: 'text-secondary', label: 'Lunas', labelStyle: 'text-secondary bg-secondary-container' };
    if (status === 'partially_paid') return { border: 'border-secondary/50', bg: 'bg-surface-container-lowest', icon: 'timelapse', iconColor: 'text-secondary', label: 'Cicilan', labelStyle: 'text-secondary bg-secondary-container' };
    if (status === 'overdue') return { border: 'border-error/20 ring-2 ring-error/30', bg: 'bg-error-container', icon: 'warning', iconColor: 'text-error', label: 'Tunggakan', labelStyle: 'text-on-error bg-error' };
    return { border: 'border-outline-variant hover:border-secondary', bg: 'bg-surface-container-lowest', icon: null, iconColor: '', label: 'Belum Bayar', labelStyle: 'text-on-surface-variant bg-surface-container' };
  };

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    setSavingIncome(true);
    try {
      const res = await api.createIncome({
        ...incomeForm,
        amount: Number(incomeForm.amount)
      });
      setShowIncomeModal(false);
      setIncomeForm({ source: '', category: '', amount: '', paymentMethod: 'cash', description: '' });
      // Open receipt
      window.open(`/receipt-income/${res.data.id}`, '_blank');
    } catch (err) {
      alert('Gagal menyimpan pemasukan: ' + err.message);
    } finally {
      setSavingIncome(false);
    }
  };

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    setSavingTopUp(true);
    try {
      const res = await api.topUpStudentBalance(selectedStudent.id, {
        amount: Number(topUpForm.amount),
        paymentMethod: topUpForm.paymentMethod,
        notes: topUpForm.notes,
      });
      setShowTopUpModal(false);
      setTopUpForm({ amount: '', paymentMethod: 'cash', notes: '' });
      // Update local balance
      setSelectedStudent({ ...selectedStudent, balance: (selectedStudent.balance || 0) + Number(topUpForm.amount) });
      // Open receipt
      window.open(`/receipt-income/${res.data.id}`, '_blank');
    } catch (err) {
      alert('Gagal menambah saldo: ' + err.message);
    } finally {
      setSavingTopUp(false);
    }
  };

  const handleEditSaldoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !editSaldoAmount) return;

    if (!window.confirm('Yakin ingin merubah saldo siswa? Tindakan ini langsung mengganti saldo siswa tanpa tercatat di laporan kas!')) {
      return;
    }

    try {
      setSavingIncome(true);
      await api.updateStudentBalance(selectedStudent.id, Number(editSaldoAmount));
      
      const res = await api.getStudentBilling(selectedStudent.id);
      setSelectedStudent(res.student);
      
      setShowEditSaldoModal(false);
      setEditSaldoAmount('');
      alert('Saldo siswa berhasil diubah.');
    } catch (err) {
      alert('Gagal mengubah saldo: ' + err.message);
    } finally {
      setSavingIncome(false);
    }
  };

  return (
    <div className="flex-1 flex w-full h-full overflow-hidden flex-row">
      {/* Left Side: Selection & Status (60%) */}
      <section className="w-[60%] flex flex-col p-container-padding gap-6 overflow-y-auto">
        {/* Search & Student Context */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold m-0 text-on-surface">Kasir Pembayaran</h2>
            <button 
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
              onClick={() => setShowIncomeModal(true)}
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Pemasukan Lain
            </button>
          </div>

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
              <div className="text-right flex gap-6">
                <div className="flex flex-col items-end">
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider m-0 mb-1">Saldo Siswa</p>
                  <p className="font-headline-sm text-headline-sm text-primary font-bold font-tabular-nums m-0 mb-2">{formatRupiah(selectedStudent.balance || 0)}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowTopUpModal(true)}
                      className="text-xs font-semibold bg-primary-container text-on-primary-container px-2 py-1 rounded-md border border-primary/20 hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span> Top Up
                    </button>
                    <button 
                      onClick={() => {
                        setEditSaldoAmount(selectedStudent.balance || 0);
                        setShowEditSaldoModal(true);
                      }}
                      className="text-xs font-semibold bg-surface border border-outline-variant text-on-surface-variant px-2 py-1 rounded-md hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider m-0 mb-1">Total Tunggakan</p>
                  <p className="font-headline-sm text-headline-sm text-error font-bold font-tabular-nums m-0">{formatRupiah(totalOutstanding)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-on-surface m-0">Top 15 Penunggak Terbesar</h3>
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
                        <p className="text-sm text-on-surface font-semibold m-0 truncate">{s.studentName}</p>
                        <p className="text-xs text-on-surface-variant m-0 truncate">{s.className}</p>
                      </div>
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
                      <div className="flex justify-between items-center">
                        <p className="font-tabular-nums text-tabular-nums text-on-surface-variant line-through text-xs mr-2">{item.paidAmount > 0 && formatRupiah(item.amount)}</p>
                        <p className="font-tabular-nums text-tabular-nums text-on-background font-bold">{formatRupiah(item.amount - (item.paidAmount || 0))}</p>
                      </div>
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
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium text-sm">Rp</span>
                    <input
                      type="number"
                      value={item.amountToPay || ''}
                      onChange={(e) => updateCartItemAmount(item.id, e.target.value)}
                      className="w-36 pl-8 pr-2 py-1.5 text-right bg-surface border border-outline-variant rounded-md font-tabular-nums focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary text-base font-semibold"
                    />
                  </div>
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

            <div className="flex justify-between mb-2">
              <span className="font-body-lg text-body-lg text-on-surface-variant">Subtotal ({cart.length} item)</span>
              <span className="font-tabular-nums text-tabular-nums text-on-background">{formatRupiah(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center mt-2 mb-4 pt-2 border-t border-surface-variant">
              <span className="font-headline-sm text-headline-sm text-on-background font-bold">Total Tagihan</span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">{formatRupiah(total)}</span>
            </div>

            <div className="mb-4 pt-2 border-t border-outline-variant/30">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Kode Diskon / Beasiswa (Opsional)</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="Masukkan kode..."
                  className="flex-1 px-3 py-1.5 text-sm bg-surface border border-outline-variant rounded-md focus:outline-none focus:border-secondary font-mono uppercase"
                  disabled={processing}
                />
                <button 
                  onClick={handleValidateDiscount}
                  disabled={!discountCode.trim() || processing}
                  className="px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-md text-sm font-medium hover:bg-secondary-container/80 transition-colors disabled:opacity-50"
                >
                  Cek
                </button>
              </div>
              {discountError && (
                <p className="text-error text-xs mt-1">{discountError}</p>
              )}
              {discountInfo && (
                <div className="mt-1 flex justify-between items-center text-xs">
                  <span className="text-secondary font-medium">Potongan {discountInfo.code}:</span>
                  <span className="text-secondary font-bold">-{formatRupiah(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="font-body-lg text-body-lg text-on-surface-variant">Gunakan Saldo ({formatRupiah(selectedStudent.balance || 0)})</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={useBalance} onChange={() => setUseBalance(!useBalance)} />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-surface-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>

            {!useBalance && (
              <div className="mb-4">
                <label className="block font-label-md text-on-surface-variant mb-1">Metode Pembayaran</label>
                <select
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md focus:border-secondary focus:outline-none"
                  value={checkoutPaymentMethod}
                  onChange={e => setCheckoutPaymentMethod(e.target.value)}
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="transfer_bri">Transfer Bank BRI</option>
                  <option value="transfer_bukopin">Transfer Bank Bukopin</option>
                  <option value="transfer_other">Transfer Lainnya</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
            )}

            {/* Input Uang Diterima */}
            {!useBalance && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-body-lg text-body-lg text-on-surface-variant">Uang Diterima (Rp)</span>
                  <div className="relative w-1/2">
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-tabular-nums text-right focus:border-secondary focus:outline-none"
                      placeholder="0"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  </div>
                </div>

                {Number(amountReceived) > total && (
                  <div className="mb-4 p-4 bg-secondary-container/20 border border-secondary/20 rounded-lg">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                        Simpan kembalian ke Saldo
                      </span>
                      <div className="relative inline-flex items-center h-5 rounded-full w-9">
                        <input 
                          type="checkbox" 
                          className="peer sr-only" 
                          checked={saveChangeAsBalance}
                          onChange={(e) => setSaveChangeAsBalance(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-surface-variant after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                      </div>
                    </label>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-end mb-6 pt-4 border-t border-surface-variant">
              <span className={`font-headline-lg text-headline-lg ${Number(amountReceived) > 0 && Number(amountReceived) < total ? 'text-error' : 'text-on-background'}`}>
                {!amountReceived ? 'Total' : Number(amountReceived) > total ? 'Kembalian' : Number(amountReceived) < total ? 'Kurang Bayar' : 'Total'}
              </span>
              <span className={`font-headline-lg text-headline-lg font-bold font-tabular-nums tracking-tight ${Number(amountReceived) > 0 && Number(amountReceived) < total ? 'text-error' : 'text-primary'}`}>
                {formatRupiah(!amountReceived ? total : Math.abs(total - Number(amountReceived)))}
              </span>
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

      {/* MODAL PEMASUKAN LAIN */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowIncomeModal(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <h3 className="font-headline-sm text-on-surface m-0">Tambah Pemasukan Lain</h3>
              <button onClick={() => setShowIncomeModal(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveIncome} className="p-6 space-y-4">
              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Dari / Sumber (Sponsor, Donatur)*</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md focus:border-secondary focus:outline-none"
                  value={incomeForm.source}
                  onChange={e => setIncomeForm({ ...incomeForm, source: e.target.value })}
                  placeholder="Contoh: PT. ABC atau Bapak Budi"
                />
              </div>
              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Kategori*</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md focus:border-secondary focus:outline-none"
                  value={incomeForm.category}
                  onChange={e => setIncomeForm({ ...incomeForm, category: e.target.value })}
                  placeholder="Contoh: Sponsorship Lomba"
                />
              </div>
              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Nominal (Rp)*</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md focus:border-secondary focus:outline-none font-tabular-nums"
                  value={incomeForm.amount}
                  onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Metode Pembayaran</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md focus:border-secondary focus:outline-none"
                  value={incomeForm.paymentMethod}
                  onChange={e => setIncomeForm({ ...incomeForm, paymentMethod: e.target.value })}
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="transfer_bri">Transfer Bank BRI</option>
                  <option value="transfer_bukopin">Transfer Bank Bukopin</option>
                  <option value="transfer_other">Transfer Lainnya</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">Keterangan / Catatan</label>
                <textarea
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md focus:border-secondary focus:outline-none min-h-[80px]"
                  value={incomeForm.description}
                  onChange={e => setIncomeForm({ ...incomeForm, description: e.target.value })}
                  placeholder="Keterangan tambahan..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="px-5 py-2.5 font-label-md text-on-surface-variant hover:bg-surface-container rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingIncome}
                  className="px-5 py-2.5 font-label-md bg-primary text-on-primary rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  {savingIncome ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Simpan & Cetak
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TOP UP SALDO */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="font-headline-sm text-on-surface m-0">Top Up Saldo Siswa</h3>
              <button 
                onClick={() => setShowTopUpModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleTopUpSubmit} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant">Siswa</label>
                <input 
                  type="text" 
                  disabled
                  value={selectedStudent?.fullName || ''}
                  className="bg-surface-container-low border border-outline-variant rounded-lg p-3 font-body-md text-on-surface opacity-70"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant text-error font-bold">Nominal Top Up *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium">Rp</span>
                  <input 
                    type="number" 
                    required
                    min="1000"
                    placeholder="Contoh: 500000"
                    value={topUpForm.amount}
                    onChange={(e) => setTopUpForm({...topUpForm, amount: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 bg-surface border-2 border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg font-body-md text-on-surface text-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant">Metode Pembayaran *</label>
                <select
                  required
                  value={topUpForm.paymentMethod}
                  onChange={(e) => setTopUpForm({...topUpForm, paymentMethod: e.target.value})}
                  className="w-full p-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:border-primary pr-10"
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="transfer">Transfer</option>
                  <option value="transfer_bri">Transfer BRI</option>
                  <option value="transfer_bukopin">Transfer Bukopin</option>
                  <option value="transfer_other">Transfer Bank Lain</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant">Keterangan (Opsional)</label>
                <textarea 
                  placeholder="Titipan dari orang tua, dll."
                  value={topUpForm.notes}
                  onChange={(e) => setTopUpForm({...topUpForm, notes: e.target.value})}
                  className="w-full p-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface h-20 resize-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-5 py-2.5 rounded-lg font-label-lg font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={savingTopUp || !topUpForm.amount}
                  className="px-5 py-2.5 rounded-lg font-label-lg font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {savingTopUp ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>}
                  Simpan Top Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT SALDO */}
      {showEditSaldoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="font-headline-sm text-on-surface m-0">Edit Saldo (Koreksi)</h3>
              <button 
                onClick={() => setShowEditSaldoModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleEditSaldoSubmit} className="p-6 flex flex-col gap-5">
              <div className="bg-error-container/30 px-4 py-3 rounded-xl mb-2 text-error font-body-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                Perubahan saldo di sini langsung memodifikasi data dan tidak tercatat sebagai transaksi pemasukan/pengeluaran di laporan kas.
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface-variant text-error font-bold">Nominal Saldo Akhir *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium">Rp</span>
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="Contoh: 150000"
                    value={editSaldoAmount}
                    onChange={(e) => setEditSaldoAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-surface border-2 border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg font-body-md text-on-surface text-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
                <button 
                  type="button" 
                  onClick={() => setShowEditSaldoModal(false)}
                  className="px-5 py-2.5 font-label-md bg-surface border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={savingIncome}
                  className="px-5 py-2.5 font-label-md bg-primary text-on-primary rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  {savingIncome ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
