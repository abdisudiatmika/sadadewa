const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Fetch wrapper with credentials (cookies) and JSON handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Don't set Content-Type for FormData (file uploads)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  // ---- Auth ----
  signIn: (email, password) =>
    request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signUp: (email, password, name, role = 'staff') =>
    request('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    }),

  signOut: () =>
    request('/api/auth/sign-out', { method: 'POST' }),

  getSession: () =>
    request('/api/auth/get-session'),

  // ---- Dashboard ----
  getDashboardStats: () =>
    request('/api/reports/dashboard/stats'),

  getTopArrears: (limit = 5) =>
    request(`/api/reports/dashboard/top-arrears?limit=${limit}`),

  getDailyIncomeReport: (date) =>
    request(`/api/reports/income/daily?date=${date}`),

  getMonthlyIncomeReport: (month, year, method) =>
    request(`/api/reports/income/monthly?month=${month}&year=${year}${method ? `&paymentMethod=${method}` : ''}`),

  getDetailedDelinquencyReport: (params) => {
    const q = new URLSearchParams(params);
    return request(`/api/reports/delinquency/detailed?${q.toString()}`);
  },

  getStudentLedger: (studentId) =>
    request(`/api/reports/student/ledger/${studentId}`),

  getClassSummaryReport: (classId) =>
    request(`/api/reports/class/summary/${classId}`),

  // ---- Expenses ----
  getExpenses: (params) => {
    const q = new URLSearchParams(params);
    return request(`/api/expenses?${q.toString()}`);
  },
  createExpense: (data) =>
    request('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) =>
    request(`/api/expenses/${id}`, { method: 'DELETE' }),

  // ---- Master Classes & Grades ----
  getGrades: () => request('/api/master/grades'),
  createGrade: (data) => request('/api/master/grades', { method: 'POST', body: JSON.stringify(data) }),
  updateGrade: (id, data) => request(`/api/master/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrade: (id) => request(`/api/master/grades/${id}`, { method: 'DELETE' }),

  getClassesMaster: () => request('/api/master/classes'),
  getTeachers: () => request('/api/master/teachers'),
  createClass: (data) => request('/api/master/classes', { method: 'POST', body: JSON.stringify(data) }),
  updateClass: (id, data) => request(`/api/master/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClass: (id) => request(`/api/master/classes/${id}`, { method: 'DELETE' }),

  // ---- Students ----
  getClasses: () =>
    request('/api/students/meta/classes'),

  getStudents: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.perPage) query.set('perPage', params.perPage);
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.classId) query.set('classId', params.classId);
    return request(`/api/students?${query.toString()}`);
  },

  getStudent: (id) =>
    request(`/api/students/${id}`),

  searchStudents: (q) =>
    request(`/api/students/search?q=${encodeURIComponent(q)}`),

  createStudent: (data) =>
    request('/api/students', { method: 'POST', body: JSON.stringify(data) }),

  updateStudent: (id, data) =>
    request(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteStudent: (id) =>
    request(`/api/students/${id}`, { method: 'DELETE' }),

  bulkUploadStudents: (records) =>
    request('/api/students/bulk-upload', { method: 'POST', body: JSON.stringify({ records }) }),

  getStudentBilling: (id, academicYearId) => {
    const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
    return request(`/api/students/${id}/billing${query}`);
  },

  // ---- Fees ----
  getFees: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.perPage) query.set('perPage', params.perPage);
    if (params.search) query.set('search', params.search);
    return request(`/api/fees?${query.toString()}`);
  },

  getFeeSummary: () =>
    request('/api/fees/summary'),

  createFee: (data) =>
    request('/api/fees', { method: 'POST', body: JSON.stringify(data) }),

  updateFee: (id, data) =>
    request(`/api/fees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteFee: (id) =>
    request(`/api/fees/${id}`, { method: 'DELETE' }),

  duplicateFee: (id) =>
    request(`/api/fees/${id}/duplicate`, { method: 'POST' }),

  generateBillsFee: (id, options = {}) =>
    request(`/api/fees/${id}/generate-bills`, { method: 'POST', body: JSON.stringify(options) }),

  // ---- Payments ----
  checkout: (data) =>
    request('/api/payments/checkout', { method: 'POST', body: JSON.stringify(data) }),

  getTransaction: (id) =>
    request(`/api/payments/${id}`),

  getTransactions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.perPage) query.set('perPage', params.perPage);
    if (params.studentId) query.set('studentId', params.studentId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    return request(`/api/payments?${query.toString()}`);
  },

  validateDiscount: (code) =>
    request('/api/payments/validate-discount', { method: 'POST', body: JSON.stringify({ code }) }),

  // ---- Reports ----
  getReportSummary: (params = {}) => {
    const query = new URLSearchParams();
    if (params.academicYearId) query.set('academicYearId', params.academicYearId);
    return request(`/api/reports/summary?${query.toString()}`);
  },

  getDelinquency: () =>
    request('/api/reports/delinquency'),

  sendReminder: (studentId, channel = 'whatsapp') =>
    request('/api/reports/send-reminder', {
      method: 'POST',
      body: JSON.stringify({ studentId, channel }),
    }),

  // ---- Settings ----
  getSettings: () =>
    request('/api/settings'),

  updateSettings: (data) =>
    request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  resetSettings: () =>
    request('/api/settings/reset', { method: 'POST' }),

  updateProfile: (data) =>
    request('/api/settings/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // ---- Users (Management) ----
  getUsers: () => request('/api/users'),
  createUser: (data) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
};
