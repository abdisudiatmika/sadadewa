import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let loginEmail = email;
      // If student role is selected and input is numeric, append student domain
      if (role === 'student' && /^\d+$/.test(email)) {
        loginEmail = `${email}@student.edupay.pro`;
      }
      
      const { user } = await login(loginEmail, password);
      if (user?.role === 'student') {
        navigate('/student');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Premium Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-80 mix-blend-multiply" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAu4KFrzTp8e69hJalI1y3K_8XdzsrY3SH0N_jaEcmDP6E09MkeUIYrOeaJQ1xj9LKEFUtob7d_CvDyFvNP4hWiKnMMDeqZ4ueDYXVcjHaxyHY_rnuEt043AT_Ifz4cBn5ZL8khD4ZZs8DxCHQSFwnX4nPU0xH99dLiQ2SmtHgg5422cqJhDELYs6ePtC7yeFcF17pkDcEkL8Z0t2U4gFHiuthdoejialUUcOs7gEvGTCmKrtjcvufJ5iblfk_TR5gdnaUQwHtbKMNP')" }}
      >
      </div>

      {/* Fallback Gradient overlay to ensure brand colors */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary-container/90 to-secondary-fixed-dim/80"></div>

      {/* Login Card Container */}
      <main className="relative z-10 w-full max-w-[440px] px-container-padding">
        {/* Glassmorphism Card */}
        <div className="bg-surface/80 backdrop-blur-xl border border-surface-container-lowest/50 rounded-xl shadow-2xl p-8 flex flex-col gap-8">
          
          {/* Header / Brand */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-2 shadow-sm">
              <span className="material-symbols-outlined text-on-secondary" style={{ fontSize: '28px' }}>account_balance</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary m-0">EduPay Pro</h1>
            <p className="font-body-md text-body-md text-on-surface-variant m-0">Fintech School OS</p>
          </div>

          {/* Role Segmented Control */}
          <div className="bg-surface-container rounded-lg p-1 flex gap-1">
            <button 
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 py-2 rounded font-label-md text-xs transition-all ${
                role === 'admin' 
                  ? 'bg-surface-container-lowest shadow-sm text-primary' 
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Admin / Staff
            </button>
            <button 
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex-1 py-2 rounded font-label-md text-xs transition-all ${
                role === 'teacher' 
                  ? 'bg-surface-container-lowest shadow-sm text-primary' 
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Wali Kelas
            </button>
            <button 
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 py-2 rounded font-label-md text-xs transition-all ${
                role === 'student' 
                  ? 'bg-surface-container-lowest shadow-sm text-primary' 
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Student
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg font-body-md text-body-md flex items-center gap-2">
              <span className="material-symbols-outlined text-error" style={{ fontSize: '20px' }}>error</span>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {/* Identifier Field (Email/NISN) */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="email">
                {role === 'student' ? 'NISN / Email' : 'Email'}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none" style={{ fontSize: '20px' }}>person</span>
                <input 
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-shadow" 
                  id="email" 
                  placeholder={role === 'student' ? 'Masukkan NISN' : 'admin@edupay.com'} 
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="password">Password</label>
                <a className="font-body-md text-body-md text-secondary hover:text-on-secondary-container hover:underline transition-colors" href="#">Forgot Password?</a>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none" style={{ fontSize: '20px' }}>lock</span>
                <input 
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-shadow" 
                  id="password" 
                  placeholder="••••••••" 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 flex items-center text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              className="mt-2 w-full bg-secondary text-on-secondary py-3 rounded-lg font-label-md text-label-md shadow-sm hover:bg-on-secondary-container transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-secondary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="font-label-md text-label-md text-surface-container-lowest/80">© 2024 EduPay Pro. Secure Financial Gateway.</p>
        </div>
      </main>
    </div>
  );
}
