const { useState, useEffect, createContext, useContext, useCallback, useRef, Fragment } = React;

// ===== API HELPER =====
const API = { base: 'api.php?action=' };
API.request = async (action, opts = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = API.base + action + (opts.id ? `&id=${opts.id}` : '') + (opts.type ? `&type=${opts.type}` : '');
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};
API.get = (a, o) => API.request(a, { ...o });
API.post = (a, b, o) => API.request(a, { ...o, method: 'POST', body: b });
API.put = (a, b, o) => API.request(a, { ...o, method: 'PUT', body: b });
API.del = (a, o) => API.request(a, { ...o, method: 'DELETE' });

// ===== TOAST =====
const ToastContext = createContext();
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'info') => { const id = Date.now(); setToasts(t => [...t, { id, msg, type }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500); };
  const success = msg => add(msg, 'success');
  const error = msg => add(msg, 'error');
  return React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'toast-container' },
      toasts.map(t => React.createElement('div', { key: t.id, className: `toast toast-${t.type}`, onClick: () => { navigator.clipboard?.writeText(t.msg); } }, t.msg))
    ),
    React.createElement(ToastContext.Provider, { value: { success, error, add } }, children)
  );
}
function useToast() { return useContext(ToastContext); }

// ===== NEPALI DATE UTILITY =====
const NP_MONTHS = ['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
const NP_DAYS = ['आइतबार','सोमबार','मङ्गलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
const NP_NUM = '०१२३४५६७८९';
const NP_MONTH_DATA = {2000:[30,32,31,32,31,30,30,30,29,30,29,31],2001:[31,31,32,31,31,31,30,29,30,29,30,30],2002:[31,31,32,32,31,30,30,29,30,29,30,30],2003:[31,32,31,32,31,30,30,30,29,29,30,31],2004:[30,32,31,32,31,30,30,30,29,30,29,31],2005:[31,31,32,31,31,31,30,29,30,29,30,30],2006:[31,31,32,32,31,30,30,29,30,29,30,30],2007:[31,32,31,32,31,30,30,30,29,29,30,31],2008:[31,31,31,32,31,31,29,30,30,29,29,31],2009:[31,31,32,31,31,31,30,29,30,29,30,30],2010:[31,31,32,32,31,30,30,29,30,29,30,30],2011:[31,32,31,32,31,30,30,30,29,29,30,31],2012:[31,31,31,32,31,31,29,30,30,29,30,30],2013:[31,31,32,31,31,31,30,29,30,29,30,30],2014:[31,31,32,32,31,30,30,29,30,29,30,30],2015:[31,32,31,32,31,30,30,30,29,29,30,31],2016:[31,31,31,32,31,31,29,30,30,29,30,30],2017:[31,31,32,31,31,31,30,29,30,29,30,30],2018:[31,32,31,32,31,30,30,29,30,29,30,30],2019:[31,32,31,32,31,30,30,30,29,30,29,31],2020:[31,31,31,32,31,31,30,29,30,29,30,30],2021:[31,31,32,31,31,31,30,29,30,29,30,30],2022:[31,32,31,32,31,30,30,30,29,29,30,30],2023:[31,32,31,32,31,30,30,30,29,30,29,31],2024:[31,31,31,32,31,31,30,29,30,29,30,30],2025:[31,31,32,31,31,31,30,29,30,29,30,30],2026:[31,32,31,32,31,30,30,30,29,29,30,31],2027:[30,32,31,32,31,30,30,30,29,30,29,31],2028:[31,31,32,31,31,31,30,29,30,29,30,30],2029:[31,31,32,31,32,30,30,29,30,29,30,30],2030:[31,32,31,32,31,30,30,30,29,29,30,31],2031:[30,32,31,32,31,30,30,30,29,30,29,31],2032:[31,31,32,31,31,31,30,29,30,29,30,30],2033:[31,31,32,32,31,30,30,29,30,29,30,30],2034:[31,32,31,32,31,30,30,30,29,29,30,31],2035:[30,32,31,32,31,31,29,30,30,29,29,31],2036:[31,31,32,31,31,31,30,29,30,29,30,30],2037:[31,31,32,32,31,30,30,29,30,29,30,30],2038:[31,32,31,32,31,30,30,30,29,29,30,31],2039:[31,31,31,32,31,31,29,30,30,29,30,30],2040:[31,31,32,31,31,31,30,29,30,29,30,30],2041:[31,31,32,32,31,30,30,29,30,29,30,30],2042:[31,32,31,32,31,30,30,30,29,29,30,31],2043:[31,31,31,32,31,31,29,30,30,29,30,30],2044:[31,31,32,31,31,31,30,29,30,29,30,30],2045:[31,32,31,32,31,30,30,29,30,29,30,30],2046:[31,32,31,32,31,30,30,30,29,29,30,31],2047:[31,31,31,32,31,31,30,29,30,29,30,30],2048:[31,31,32,31,31,31,30,29,30,29,30,30],2049:[31,32,31,32,31,30,30,30,29,29,30,30],2050:[31,32,31,32,31,30,30,30,29,30,29,31],2051:[31,31,31,32,31,31,30,29,30,29,30,30],2052:[31,31,32,31,31,31,30,29,30,29,30,30],2053:[31,32,31,32,31,30,30,30,29,29,30,30],2054:[31,32,31,32,31,30,30,30,29,30,29,31],2055:[31,31,32,31,31,31,30,29,30,29,30,30],2056:[31,31,32,31,32,30,30,29,30,29,30,30],2057:[31,32,31,32,31,30,30,30,29,29,30,31],2058:[30,32,31,32,31,30,30,30,29,30,29,31],2059:[31,31,32,31,31,31,30,29,30,29,30,30],2060:[31,31,32,32,31,30,30,29,30,29,30,30],2061:[31,32,31,32,31,30,30,30,29,29,30,31],2062:[30,32,31,32,31,31,29,30,29,30,29,31],2063:[31,31,32,31,31,31,30,29,30,29,30,30],2064:[31,31,32,32,31,30,30,29,30,29,30,30],2065:[31,32,31,32,31,30,30,30,29,29,30,31],2066:[31,31,31,32,31,31,29,30,30,29,29,31],2067:[31,31,32,31,31,31,30,29,30,29,30,30],2068:[31,31,32,32,31,30,30,29,30,29,30,30],2069:[31,32,31,32,31,30,30,30,29,29,30,31],2070:[31,31,31,32,31,31,29,30,30,29,30,30],2071:[31,31,32,31,31,31,30,29,30,29,30,30],2072:[31,32,31,32,31,30,30,29,30,29,30,30],2073:[31,32,31,32,31,30,30,30,29,29,30,31],2074:[31,31,31,32,31,31,30,29,30,29,30,30],2075:[31,31,32,31,31,31,30,29,30,29,30,30],2076:[31,32,31,32,31,30,30,30,29,29,30,30],2077:[31,32,31,32,31,30,30,30,29,30,29,31],2078:[31,31,31,32,31,31,30,29,30,29,30,30],2079:[31,31,32,31,31,31,30,29,30,29,30,30],2080:[31,32,31,32,31,30,30,30,29,29,30,30],2081:[31,31,32,32,31,30,30,30,29,30,30,30],2082:[30,32,31,32,31,30,30,30,29,30,30,30],2083:[31,31,32,31,31,30,30,30,29,30,30,30],2084:[31,31,32,31,31,30,30,30,29,30,30,30],2085:[31,32,31,32,30,31,30,30,29,30,30,30],2086:[30,32,31,32,31,30,30,30,29,30,30,30],2087:[31,31,32,31,31,31,30,30,29,30,30,30],2088:[30,31,32,32,30,31,30,30,29,30,30,30],2089:[30,32,31,32,31,30,30,30,29,30,30,30],2090:[30,32,31,32,31,30,30,30,29,30,30,30],2091:[31,31,32,31,31,31,30,30,29,30,30,30],2092:[30,31,32,32,31,30,30,30,29,30,30,30],2093:[30,32,31,32,31,30,30,30,29,30,30,30],2094:[31,31,32,31,31,30,30,30,29,30,30,30],2095:[31,31,32,31,31,31,30,29,30,30,30,30],2096:[30,31,32,32,31,30,30,29,30,29,30,30],2097:[31,32,31,32,31,30,30,30,29,30,30,30],2098:[31,31,32,31,31,31,29,30,29,30,30,31],2099:[31,31,32,31,31,31,30,29,29,30,30,30],2100:[31,32,31,32,30,31,30,29,30,29,30,30]};
function toNepaliNum(n) { return String(n).replace(/\d/g, d => NP_NUM[d]); }
function adToBs(adDate) {
  const ref = new Date(1943, 3, 14);
  let totalDays = Math.round((adDate - ref) / 86400000);
  if (totalDays < 0) return null;
  for (let y = 2000; y <= 2100; y++) {
    const yd = NP_MONTH_DATA[y]; if (!yd) return null;
    const yearDays = yd.reduce((a, b) => a + b, 0);
    if (totalDays < yearDays) {
      for (let m = 0; m < 12; m++) {
        if (totalDays < yd[m]) return { year: y, month: m + 1, day: totalDays + 1 };
        totalDays -= yd[m];
      }
    }
    totalDays -= yearDays;
  }
  return null;
}
function getNepaliClock() {
  const now = new Date();
  const bs = adToBs(now);
  if (!bs) return { date: '', time: '', day: '' };
  const h = now.getHours(), mn = now.getMinutes(), s = now.getSeconds();
  return {
    date: `${toNepaliNum(bs.year)}-${toNepaliNum(String(bs.month).padStart(2,'0'))}-${toNepaliNum(String(bs.day).padStart(2,'0'))}`,
    time: `${toNepaliNum(String(h).padStart(2,'0'))}:${toNepaliNum(String(mn).padStart(2,'0'))}:${toNepaliNum(String(s).padStart(2,'0'))}`,
    day: NP_DAYS[now.getDay()]
  };
}
function adDateToBsLabel(adDateStr) {
  if (!adDateStr || !adDateStr.match(/^\d{4}-\d{2}/)) return adDateStr;
  const [y, m, d] = adDateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const bs = adToBs(date);
  if (!bs) return adDateStr;
  let label = `${toNepaliNum(bs.year)}-${toNepaliNum(String(bs.month).padStart(2,'0'))}-${toNepaliNum(String(bs.day).padStart(2,'0'))}`;
  if (d) label += ` (${NP_DAYS[date.getDay()]})`;
  return label;
}
function adMonthToBsLabel(adMonthStr) {
  const [y, m] = adMonthStr.split('-').map(Number);
  if (!y || !m) return adMonthStr;
  const d = new Date(y, m - 1, 1);
  const bs = adToBs(d);
  if (!bs) return adMonthStr;
  return `${toNepaliNum(bs.year)}-${toNepaliNum(String(bs.month).padStart(2,'0'))} (${NP_MONTHS[bs.month - 1]})`;
}
// ===== AUTH CONTEXT =====
const AuthContext = createContext();
function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [loading, setLoading] = useState(false);
  const login = async (member_id, password) => {
    setLoading(true);
    try {
      const data = await API.post('login', { member_id, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally { setLoading(false); }
  };
  const logout = () => { localStorage.clear(); setUser(null); };
  return React.createElement(AuthContext.Provider, { value: { user, login, logout, loading } }, children);
}
function useAuth() { return useContext(AuthContext); }

// ===== SIMPLE ROUTER =====
function useRouter() {
  const [hash, setHash] = useState(window.location.hash || '#/home');
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/home');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  const navigate = useCallback((path) => { window.location.hash = path; }, []);
  return { hash: hash.replace(/^#/, ''), navigate };
}

// ===== LAYOUT =====
function Sidebar({ user, logout, navigate, hash }) {
  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  const links = isAdmin ? [
    { to: '/admin', label: 'Dashboard', icon: 'D' },
    { to: '/admin/members', label: 'Members', icon: 'M' },
    { to: '/admin/deposits', label: 'Deposits', icon: 'S' },
    { to: '/admin/loans', label: 'Loans', icon: 'L' },
    { to: '/admin/fines', label: 'Fines', icon: 'F' },
    { to: '/admin/transactions', label: 'Transactions', icon: 'T' },
    { to: '/admin/old-transactions', label: 'Old Transactions', icon: 'O' },
    { to: '/admin/reports', label: 'Reports', icon: 'R' },
    { to: '/admin/password-resets', label: 'Password Resets', icon: 'P' },
    { to: '/admin/settings', label: 'Settings', icon: 'G' },
  ] : [
    { to: '/member', label: 'Dashboard', icon: 'D' },
    { to: '/member/deposits', label: 'My Deposits', icon: 'S' },
    { to: '/member/loans', label: 'My Loans', icon: 'L' },
    { to: '/member/fines', label: 'Fines & Transactions', icon: 'F' },
    { to: '/member/reports', label: 'My Reports', icon: 'R' },
  ];
  const [open, setOpen] = useState(false);
  return React.createElement(React.Fragment, null,
    React.createElement('button', {
      className: 'mobile-toggle',
      onClick: () => setOpen(!open)
    }, '☰'),
    React.createElement('div', { className: `sidebar ${open ? 'open' : ''}` },
      React.createElement('div', { className: 'sidebar-header' },
        React.createElement('div', { className: 'org-icon' }, 'SA'),
        React.createElement('h2', null, 'SUBHA AARAMBHA'),
        React.createElement('p', null, 'शुभ आरम्भ युवा समुह')
      ),
      React.createElement('div', { className: 'sidebar-nav' },
        React.createElement('div', { className: 'section-label' }, user.name),
        links.map(l => React.createElement('a', {
          key: l.to, href: `#${l.to}`,
          className: hash.startsWith(l.to) ? 'active' : '',
          onClick: () => { navigate(l.to); if (window.innerWidth <= 768) setOpen(false); }
        }, React.createElement('span', { className: 'nav-icon' }, l.icon), ' ', l.label)        ), React.createElement('div', { className: 'sidebar-user' }, `${user.name} (${user.role})`),
        React.createElement('div', { className: 'sidebar-footer' },
          React.createElement('button', { className: 'nav-btn', onClick: logout },
            React.createElement('span', { className: 'nav-icon' }, 'X'), ' Logout')
        )
      )
    )
  );
}

function ProtectedLayout({ children, user, logout, navigate, hash }) {
  const [nepaliClock, setNepaliClock] = useState({ date: '', time: '', day: '' });
  useEffect(() => { setNepaliClock(getNepaliClock()); const t = setInterval(() => setNepaliClock(getNepaliClock()), 1000); return () => clearInterval(t); }, []);
  return React.createElement('div', { className: 'layout' },
    React.createElement(Sidebar, { user, logout, navigate, hash }),
    React.createElement('div', { className: 'main-content' },
      React.createElement('div', { className: 'org-header' },
        React.createElement('div', { className: 'org-header-inner' },
          React.createElement('div', { className: 'org-brand' },
            React.createElement('div', { className: 'org-name' }, 'SUBHA AARAMBHA YUBA SAMUHA'),
            React.createElement('div', { className: 'org-name-np' }, 'शुभ आरम्भ युवा समुह')
          ),
          React.createElement('div', { className: 'nepali-clock' },
            React.createElement('div', { className: 'clock-date' }, nepaliClock.date),
            React.createElement('div', { className: 'clock-time' }, nepaliClock.time),
            React.createElement('div', { className: 'clock-day' }, nepaliClock.day)
          ),
          React.createElement('div', { className: 'user-badge' },
            React.createElement('button', { className: 'logout-btn', onClick: logout }, '✕ Logout')
          )
        )
      ),
      children
    )
  );
}

// ===== PAGES =====
function HomePage({ navigate }) {
  return React.createElement('div', { className: 'home-page' },
    React.createElement('div', { className: 'home-card' },
      React.createElement('div', { className: 'logo-icon' }, 'SA'),
      React.createElement('h1', null, 'SUBHA AARAMBHA YUBA SAMUHA'),
      React.createElement('p', { className: 'subtitle' }, 'शुभ आरम्भ युवा समुह'),
      React.createElement('div', { className: 'home-actions' },
        React.createElement('button', { className: 'btn btn-primary', onClick: () => navigate('/login') }, 'Sign In'),
        React.createElement('button', { className: 'btn btn-outline', onClick: () => navigate('/home') }, 'Learn More')
      )
    )
  );
}

function LoginPage({ navigate }) {
  const { login, loading } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ member_id: '', password: '' });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotId, setForgotId] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const user = await login(form.member_id, form.password);
      toast.success(`Welcome, ${user.name}!`);
      navigate(user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/member');
    } catch (err) { toast.error(err.message || 'Login failed'); }
  };
  const handleForgot = async e => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg('');
    try {
      const data = await API.post('password-reset', { member_id: forgotId });
      setForgotMsg(data.message);
      setForgotId('');
    } catch (err) { setForgotMsg(err.message); }
    finally { setForgotLoading(false); }
  };
  return React.createElement('div', { className: 'login-page' },
    React.createElement('div', { className: 'login-card' },
      React.createElement('div', { className: 'login-logo' },
        React.createElement('div', { className: 'logo-icon' }, 'SA'),
        React.createElement('h1', null, 'SUBHA AARAMBHA YUBA SAMUHA'),
        React.createElement('p', null, 'शुभ आरम्भ युवा समुह')
      ),
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Member ID (Phone Number)'),
          React.createElement('input', { className: 'form-control', placeholder: 'e.g. 9812345670', value: form.member_id, onChange: e => setForm(f => ({ ...f, member_id: e.target.value })), required: true })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Password'),
          React.createElement('input', { type: 'password', className: 'form-control', placeholder: 'Enter password', value: form.password, onChange: e => setForm(f => ({ ...f, password: e.target.value })), required: true })
        ),
        React.createElement('button', { className: 'btn btn-primary', style: { width: '100%', padding: 12 }, disabled: loading },
          loading ? 'Signing in...' : 'Sign In'
        )
      ),
      React.createElement('div', { style: { textAlign: 'center', marginTop: 12 } },
        React.createElement('button', {
          className: 'btn btn-link',
          style: { fontSize: 12, color: '#2563eb', cursor: 'pointer', border: 'none', background: 'none', padding: 0 },
          onClick: () => { setShowForgot(true); setForgotMsg(''); setForgotId(''); }
        }, 'Forgot Password?')
      ),
      React.createElement('p', { style: { textAlign: 'center', marginTop: 8, fontSize: 12, color: '#6b7280' } }, 'Use your phone number as Member ID and password to sign in')
    ),
    showForgot ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setShowForgot(false) },
      React.createElement('div', { className: 'modal', style: { maxWidth: 400 } },
        React.createElement('h3', null, 'Reset Password'),
        React.createElement('p', { className: 'text-muted text-sm mt-4' }, 'Enter your phone number (Member ID) and submit. An admin will review your request.'),
        React.createElement('form', { onSubmit: handleForgot },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Member ID (Phone Number)'),
            React.createElement('input', { className: 'form-control', placeholder: 'e.g. 9812345670', value: forgotId, onChange: e => setForgotId(e.target.value), required: true })
          ),
          forgotMsg ? React.createElement('p', { className: `text-sm mt-4 ${forgotMsg.includes('submitted') ? 'text-success' : 'text-danger'}` }, forgotMsg) : null,
          React.createElement('div', { className: 'modal-actions' },
            React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => setShowForgot(false) }, 'Close'),
            React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: forgotLoading }, forgotLoading ? 'Submitting...' : 'Submit Request')
          )
        )
      )
    ) : null
  );
}

function LoadingPage() {
  return React.createElement('div', { className: 'loading-page' }, React.createElement('div', { className: 'spinner' }));
}

// ===== ADMIN PAGES =====
function AdminDashboard({ navigate }) {
  const [data, setData] = useState(null);
  const [seeded, setSeeded] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();
  useEffect(() => {
    API.get('dashboard').then(setData).catch(e => toast.error(e.message));
    API.get('seed').then(r => setSeeded(r.seeded)).catch(() => {});
  }, []);
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const r = await API.post('seed', {});
      toast.success(r.message);
      setSeeded(true);
      API.get('dashboard').then(setData).catch(e => toast.error(e.message));
    } catch (e) { toast.error(e.message); }
    finally { setSeeding(false); }
  };
  if (!data) return React.createElement(LoadingPage);
  const stats = [
    { label: 'Total Members', value: data.members.total, sub: `${data.members.active} active`, color: '#1e40af' },
    { label: 'Total Funds', value: `Rs. ${(data.total_funds || 0).toLocaleString()}`, sub: `${data.total_monthly_deposits?.toLocaleString()} deposits`, color: '#059669' },
    { label: 'Active Loans', value: data.loans.active, sub: `Rs. ${(data.loans.active_amount || 0).toLocaleString()}`, color: '#d97706' },
    { label: 'Pending Deposits', value: data.pending_deposits.count, sub: 'unpaid', color: '#dc2626' },
    { label: 'Unpaid Fines', value: data.unpaid_fines.count, sub: `Rs. ${(data.unpaid_fines.total || 0).toLocaleString()}`, color: '#dc2626' },
    { label: 'Surplus', value: `Rs. ${(data.total_surplus || 0).toLocaleString()}`, sub: 'interest + fines', color: '#7c3aed' },
  ];
  return React.createElement('div', null,
    seeded === false
      ? React.createElement('div', { className: 'alert alert-warning', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement('span', null, '⚠️ No sample data found. Add sample members, deposits, loans, and transactions to test the system.'),
        React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: handleSeed, disabled: seeding }, seeding ? 'Seeding...' : 'Seed Sample Data')
      ) : null,
    data.pending_deposits.count > 0 || data.unpaid_fines.count > 0
      ? React.createElement('div', { className: 'alert alert-warning' }, `⚠️ ${data.pending_deposits.count} pending deposits, ${data.unpaid_fines.count} unpaid fines`)
      : null,
    React.createElement('div', { className: 'stats-grid' },
      stats.map(s => React.createElement('div', { key: s.label, className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, s.label),
        React.createElement('div', { className: 'stat-value', style: { color: s.color } }, s.value),
        React.createElement('div', { className: 'stat-sub' }, s.sub)
      ))
    ),
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Recent Transactions'),
      React.createElement('div', { className: 'flex gap-8' },
        React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: () => navigate('/admin/transactions') }, 'View All')
      )
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null,
            ['ID','Type','Amount','Description','Date','Member'].map(h => React.createElement('th', { key: h }, h))
          )),
          React.createElement('tbody', null,
            data.recent_transactions.length === 0
              ? React.createElement('tr', null, React.createElement('td', { colSpan: 6, style: { textAlign: 'center', color: '#9ca3af' } }, 'No transactions yet'))
              : data.recent_transactions.map(t => React.createElement('tr', { key: t.id },
                  React.createElement('td', null, t.id),
                  React.createElement('td', null, React.createElement('span', { className: `badge badge-${t.type === 'deposit' || t.type === 'opening_balance' ? 'success' : t.type === 'loan_payment' || t.type === 'fine_paid' ? 'info' : 'warning'}` }, t.type)),
                  React.createElement('td', null, `Rs. ${(+t.amount).toLocaleString()}`),
                  React.createElement('td', { className: 'truncate', style: { maxWidth: 200 } }, t.description || '-'),
                  React.createElement('td', null, t.transaction_date),
                  React.createElement('td', null, t.full_name || '-')
                ))
          )
        )
      )
    )
  );
}

function AdminMembers({ navigate }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '', join_date: '', role: 'member', position: '', opening_balance: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetMember, setResetMember] = useState(null);
  const [resetPwd, setResetPwd] = useState('');
  const fileInputRef = useRef(null);
  const toast = useToast();
  const load = () => API.get('members').then(setMembers).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const filtered = members.filter(m => ((m.first_name || '') + ' ' + (m.last_name || '')).toLowerCase().includes(search.toLowerCase()) || (m.phone || '').includes(search.toLowerCase()));
  const openCreate = () => { setEditMember(null); setForm({ first_name: '', last_name: '', email: '', phone: '', address: '', join_date: new Date().toISOString().slice(0,10), role: 'member', position: '', opening_balance: '' }); setShowModal(true); };
  const openEdit = (m) => { setEditMember(m); setForm({ first_name: m.first_name, last_name: m.last_name, email: m.email || '', phone: m.phone || '', address: m.address || '', join_date: m.join_date, role: m.role, position: m.position || '', opening_balance: m.opening_balance }); setShowModal(true); };
  const downloadTemplate = () => {
    const csv = 'first_name,last_name,role,phone,position\nJohn,Doe,member,9812345670,Treasurer';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return toast.error('Select a CSV file');
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('api.php?action=members&id=import-csv', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      toast.success(data.message);
      setShowImportModal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (e) { toast.error(e.message); }
    finally { setImporting(false); }
  };
  const handleSave = async e => {
    e.preventDefault();
    try {
      if (editMember) {
        const body = {};
        ['first_name','last_name','email','phone','address','join_date','role','position','opening_balance'].forEach(f => { if (form[f] !== undefined) body[f] = form[f]; });
        if (form.password) body.password = form.password;
        await API.put('members', body, { id: editMember.id });
        toast.success('Member updated');
      } else {
        await API.post('members', form);
        toast.success('Member created');
      }
      setShowModal(false);
      load();
    } catch (e) { toast.error(e.message); }
  };
  const handleDelete = async (m) => {
    if (!confirm(`Delete ${m.full_name}?`)) return;
    try { await API.del('members', { id: m.id }); toast.success('Member deleted'); load(); } catch (e) { toast.error(e.message); }
  };
  const handleExit = async (m) => {
    const date = prompt('Exit date (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
    if (!date) return;
    try { const d = await API.post('members', { exit_date: date, user_id: JSON.parse(localStorage.getItem('user') || '{}').id }, { id: m.id, type: 'exit' }); toast.success(`Exited. Refund: Rs.${d.refund_amount}`); load(); } catch (e) { toast.error(e.message); }
  };
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Members'),
      React.createElement('div', { className: 'flex gap-8' },
        React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: () => setShowImportModal(true) }, 'Import CSV'),
        React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: openCreate }, '+ Add Member')
      )
    ),
    React.createElement('div', { className: 'search-bar' },
      React.createElement('input', { placeholder: 'Search by name or ID...', value: search, onChange: e => setSearch(e.target.value) })
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['ID','Phone (Member ID)','First Name','Last Name','Role','Status','Actions'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
              filtered.map(m => React.createElement('tr', { key: m.id },
              React.createElement('td', null, m.id),
              React.createElement('td', null, m.phone || m.member_id),
              React.createElement('td', null, m.first_name),
              React.createElement('td', null, m.last_name),
              React.createElement('td', null, React.createElement('span', { className: `badge badge-${m.role === 'superadmin' ? 'warning' : m.role === 'admin' ? 'info' : 'success'}` }, m.role)),
              React.createElement('td', null, React.createElement('span', { className: `badge ${m.is_active ? 'badge-success' : 'badge-danger'}` }, m.is_active ? 'Active' : 'Inactive')),
              React.createElement('td', null,
                React.createElement('div', { className: 'actions' },
                  React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: () => openEdit(m) }, 'Edit'),
                  m.is_active ? React.createElement('button', { className: 'btn btn-warning btn-sm', onClick: () => handleExit(m) }, 'Exit') : null,
                  React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => handleDelete(m) }, 'Del'),
                  user.role === 'superadmin'
                    ? React.createElement('button', { className: 'btn btn-outline btn-sm', style: { borderColor: '#d97706', color: '#d97706' }, onClick: () => { setResetMember(m); setResetPwd(''); } }, 'Reset')
                    : null
                )
              )
            ))
          )
        )
      )
    ),
    showModal ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setShowModal(false) },
      React.createElement('div', { className: 'modal' },
        React.createElement('h3', null, editMember ? 'Edit Member' : 'Add Member'),
        React.createElement('form', { onSubmit: handleSave },
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'First Name *'),
              React.createElement('input', { className: 'form-control', value: form.first_name, onChange: e => setForm(f => ({...f, first_name: e.target.value})), required: true })
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Last Name *'),
              React.createElement('input', { className: 'form-control', value: form.last_name, onChange: e => setForm(f => ({...f, last_name: e.target.value})), required: true })
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Email'),
              React.createElement('input', { type: 'email', className: 'form-control', value: form.email, onChange: e => setForm(f => ({...f, email: e.target.value})) })
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Phone * (used as Member ID and Password)'),
              React.createElement('input', { className: 'form-control', value: form.phone, onChange: e => setForm(f => ({...f, phone: e.target.value})), required: true })
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Role *'),
              React.createElement('select', { className: 'form-control', value: form.role, onChange: e => setForm(f => ({...f, role: e.target.value})) },
                React.createElement('option', { value: 'member' }, 'Member'),
                React.createElement('option', { value: 'admin' }, 'Admin')
              )
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Position'),
              React.createElement('input', { className: 'form-control', value: form.position, onChange: e => setForm(f => ({...f, position: e.target.value})) })
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Join Date *'),
              React.createElement('input', { type: 'date', className: 'form-control', value: form.join_date, onChange: e => setForm(f => ({...f, join_date: e.target.value})), required: true })
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Opening Balance'),
              React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.opening_balance, onChange: e => setForm(f => ({...f, opening_balance: e.target.value})) })
            )
          ),
          editMember ? React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'New Password (leave empty to keep)'),
            React.createElement('input', { type: 'password', className: 'form-control', value: form.password || '', onChange: e => setForm(f => ({...f, password: e.target.value})), placeholder: 'Leave empty to keep current' })
          ) : null,
          React.createElement('div', { className: 'modal-actions' },
            React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => setShowModal(false) }, 'Cancel'),
            React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, editMember ? 'Update' : 'Create')
          )
        )
      )
    ) : null,
    showImportModal ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setShowImportModal(false) },
      React.createElement('div', { className: 'modal' },
        React.createElement('h3', null, 'Import Members from CSV'),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Template'),
          React.createElement('button', { type: 'button', className: 'btn btn-outline btn-sm', onClick: downloadTemplate }, 'Download Template CSV')
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'CSV File *'),
          React.createElement('input', { type: 'file', accept: '.csv', ref: fileInputRef, className: 'form-control', style: { padding: 8 } }),
          React.createElement('p', { className: 'text-muted text-sm mt-4' }, 'Columns: first_name, last_name, role, phone, position. Phone is used as Member ID and password.')
        ),
        React.createElement('div', { className: 'modal-actions' },
          React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => { setShowImportModal(false); if (fileInputRef.current) fileInputRef.current.value = ''; } }, 'Cancel'),
          React.createElement('button', { type: 'button', className: 'btn btn-primary', onClick: handleImport, disabled: importing }, importing ? 'Importing...' : 'Import')
        )
      )
    ) : null,
    resetMember ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && (setResetMember(null), setResetPwd('')) },
      React.createElement('div', { className: 'modal', style: { maxWidth: 400 } },
        React.createElement('h3', null, 'Reset Password'),
        React.createElement('p', { className: 'text-muted text-sm' }, `Member: ${resetMember.full_name || resetMember.first_name + ' ' + resetMember.last_name}`),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'New Password *'),
          React.createElement('input', { type: 'password', className: 'form-control', value: resetPwd, onChange: e => setResetPwd(e.target.value), placeholder: 'Enter new password (min 6 chars)', required: true, minLength: 6 })
        ),
        React.createElement('div', { className: 'modal-actions' },
          React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => { setResetMember(null); setResetPwd(''); } }, 'Cancel'),
          React.createElement('button', { type: 'button', className: 'btn btn-primary', onClick: async () => {
            if (!resetPwd || resetPwd.length < 6) return toast.error('Password must be at least 6 characters');
            try { await API.put('members', { password: resetPwd }, { id: resetMember.id, type: 'reset-password' }); toast.success('Password reset successfully'); setResetMember(null); setResetPwd(''); } catch (e) { toast.error(e.message); }
          } }, 'Reset Password')
        )
      )
    ) : null
  );
}

function AdminDeposits({ navigate }) {
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ member_id: '', amount: '', deposit_month: '', status: 'paid', paid_date: '', notes: '' });
  const [members, setMembers] = useState([]);
  const toast = useToast();
  const load = () => API.get('deposits').then(setData).catch(e => toast.error(e.message));
  useEffect(() => { load(); API.get('members').then(setMembers).catch(() => {}); }, []);
  const filtered = data.filter(d => !filter || d.status === filter);
  const handleGenMonthly = async () => {
    try { const d = await API.post('deposits', {}, { id: 'generate-monthly' }); toast.success(d.message); load(); } catch (e) { toast.error(e.message); }
  };
  const handleSave = async e => {
    e.preventDefault();
    try { await API.post('deposits', form); toast.success('Deposit created'); setShowModal(false); load(); } catch (e) { toast.error(e.message); }
  };
  const handlePay = async (d) => {
    try { await API.put('deposits', { status: 'paid', paid_date: new Date().toISOString().slice(0,10) }, { id: d.id }); toast.success('Deposit marked paid'); load(); } catch (e) { toast.error(e.message); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this deposit?')) return;
    try { await API.del('deposits', { id }); toast.success('Deleted'); load(); } catch (e) { toast.error(e.message); }
  };
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Deposits'),
      React.createElement('div', { className: 'flex gap-8' },
        React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: handleGenMonthly }, 'Generate Monthly'),
        React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => { setForm({ member_id: '', amount: '', deposit_month: new Date().toISOString().slice(0,7), status: 'paid', paid_date: new Date().toISOString().slice(0,10), notes: '' }); setShowModal(true); } }, '+ Add Deposit')
      )
    ),
    React.createElement('div', { className: 'search-bar' },
      React.createElement('select', { value: filter, onChange: e => setFilter(e.target.value) },
        React.createElement('option', { value: '' }, 'All'),
        React.createElement('option', { value: 'paid' }, 'Paid'),
        React.createElement('option', { value: 'unpaid' }, 'Unpaid')
      )
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['ID','Member','Amount','Month','Status','Paid Date','Actions'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            filtered.map(d => React.createElement('tr', { key: d.id },
              React.createElement('td', null, d.id),
              React.createElement('td', null, d.full_name || `Member #${d.member_id}`),
              React.createElement('td', null, `Rs. ${(+d.amount).toLocaleString()}`),
              React.createElement('td', null, d.deposit_month),
              React.createElement('td', null, React.createElement('span', { className: `badge ${d.status === 'paid' ? 'badge-success' : 'badge-danger'}` }, d.status)),
              React.createElement('td', null, d.paid_date || '-'),
              React.createElement('td', null,
                React.createElement('div', { className: 'actions' },
                  d.status === 'unpaid' ? React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => handlePay(d) }, 'Pay') : null,
                  React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => handleDelete(d.id) }, 'Del')
                )
              )
            ))
          )
        )
      )
    ),
    showModal ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setShowModal(false) },
      React.createElement('div', { className: 'modal' },
        React.createElement('h3', null, 'Add Deposit'),
        React.createElement('form', { onSubmit: handleSave },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Member *'),
            React.createElement('select', { className: 'form-control', value: form.member_id, onChange: e => setForm(f => ({...f, member_id: e.target.value})), required: true },
              React.createElement('option', { value: '' }, 'Select member'),
              members.map(m => React.createElement('option', { key: m.id, value: m.id }, `${m.member_id} - ${m.full_name}`))
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Amount *'),
              React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.amount, onChange: e => setForm(f => ({...f, amount: e.target.value})), required: true })
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Month (YYYY-MM) *'),
              React.createElement('input', { className: 'form-control', value: form.deposit_month, onChange: e => setForm(f => ({...f, deposit_month: e.target.value})), required: true, placeholder: 'e.g. 2081-01' })
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Status'),
              React.createElement('select', { className: 'form-control', value: form.status, onChange: e => setForm(f => ({...f, status: e.target.value})) },
                React.createElement('option', { value: 'paid' }, 'Paid'),
                React.createElement('option', { value: 'unpaid' }, 'Unpaid')
              )
            ),
            form.status === 'paid' ? React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Paid Date'),
              React.createElement('input', { type: 'date', className: 'form-control', value: form.paid_date, onChange: e => setForm(f => ({...f, paid_date: e.target.value})) })
            ) : null
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Notes'),
            React.createElement('textarea', { className: 'form-control', value: form.notes, onChange: e => setForm(f => ({...f, notes: e.target.value})) })
          ),
          React.createElement('div', { className: 'modal-actions' },
            React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => setShowModal(false) }, 'Cancel'),
            React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Create')
          )
        )
      )
    ) : null
  );
}

function AdminLoans({ navigate }) {
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ member_id: '', loan_amount: '', interest_rate: '0', start_date: new Date().toISOString().slice(0,10), notes: '' });
  const [members, setMembers] = useState([]);
  const toast = useToast();
  const load = () => API.get('loans').then(setData).catch(e => toast.error(e.message));
  useEffect(() => { load(); API.get('members').then(setMembers).catch(() => {}); }, []);
  const handleSave = async e => {
    e.preventDefault();
    try { await API.post('loans', form); toast.success('Loan created'); setShowModal(false); load(); } catch (e) { toast.error(e.message); }
  };
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Loans'),
      React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => { setForm({ member_id: '', loan_amount: '', interest_rate: '0', start_date: new Date().toISOString().slice(0,10), notes: '' }); setShowModal(true); } }, '+ Add Loan')
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['ID','Member','Amount','Interest','Total Payable','Paid','Status','Actions'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            data.map(l => React.createElement('tr', { key: l.id },
              React.createElement('td', null, l.id),
              React.createElement('td', null, l.full_name || `Member #${l.member_id}`),
              React.createElement('td', null, `Rs. ${(+l.loan_amount).toLocaleString()}`),
              React.createElement('td', null, `${l.interest_rate}%`),
              React.createElement('td', null, `Rs. ${(+l.total_payable).toLocaleString()}`),
              React.createElement('td', null, `Rs. ${(+l.amount_paid).toLocaleString()}`),
              React.createElement('td', null, React.createElement('span', { className: `badge ${l.status === 'active' ? 'badge-warning' : 'badge-success'}` }, l.status)),
              React.createElement('td', null,
                l.status === 'active'
                  ? React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => navigate(`/admin/loans/${l.id}`) }, 'Pay')
                  : null
              )
            ))
          )
        )
      )
    ),
    showModal ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setShowModal(false) },
      React.createElement('div', { className: 'modal' },
        React.createElement('h3', null, 'Add Loan'),
        React.createElement('form', { onSubmit: handleSave },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Member *'),
            React.createElement('select', { className: 'form-control', value: form.member_id, onChange: e => setForm(f => ({...f, member_id: e.target.value})), required: true },
              React.createElement('option', { value: '' }, 'Select member'),
              members.map(m => React.createElement('option', { key: m.id, value: m.id }, `${m.member_id} - ${m.full_name}`))
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Loan Amount *'),
              React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.loan_amount, onChange: e => setForm(f => ({...f, loan_amount: e.target.value})), required: true })
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Interest Rate (%)'),
              React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.interest_rate, onChange: e => setForm(f => ({...f, interest_rate: e.target.value})) })
            )
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Start Date *'),
            React.createElement('input', { type: 'date', className: 'form-control', value: form.start_date, onChange: e => setForm(f => ({...f, start_date: e.target.value})), required: true })
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Notes'),
            React.createElement('textarea', { className: 'form-control', value: form.notes, onChange: e => setForm(f => ({...f, notes: e.target.value})) })
          ),
          React.createElement('div', { className: 'modal-actions' },
            React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => setShowModal(false) }, 'Cancel'),
            React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Create')
          )
        )
      )
    ) : null
  );
}

function AdminLoanDetail({ navigate, id }) {
  const [loan, setLoan] = useState(null);
  const [amount, setAmount] = useState('');
  const toast = useToast();
  useEffect(() => { API.get('loans', { id }).then(setLoan).catch(e => toast.error(e.message)); }, [id]);
  if (!loan) return React.createElement(LoadingPage);
  const handlePay = async e => {
    e.preventDefault();
    if (!amount || +amount <= 0) return toast.error('Enter valid amount');
    try { const d = await API.post('loans', { amount: +amount, payment_date: new Date().toISOString().slice(0,10) }, { id: loan.id, type: 'pay' }); toast.success(`Payment recorded. Remaining: Rs.${d.remaining}`); setAmount(''); API.get('loans', { id: loan.id }).then(setLoan); } catch (e) { toast.error(e.message); }
  };
  return React.createElement('div', null,
    React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: () => navigate('/admin/loans'), style: { marginBottom: 16 } }, '← Back to Loans'),
    React.createElement('div', { className: 'stats-grid' },
      React.createElement('div', { className: 'stat-card' }, React.createElement('div', { className: 'stat-label' }, 'Member'), React.createElement('div', { className: 'stat-value', style: { fontSize: 20 } }, loan.full_name)),
      React.createElement('div', { className: 'stat-card' }, React.createElement('div', { className: 'stat-label' }, 'Loan Amount'), React.createElement('div', { className: 'stat-value' }, `Rs. ${(+loan.loan_amount).toLocaleString()}`)),
      React.createElement('div', { className: 'stat-card' }, React.createElement('div', { className: 'stat-label' }, 'Total Payable'), React.createElement('div', { className: 'stat-value' }, `Rs. ${(+loan.total_payable).toLocaleString()}`)),
      React.createElement('div', { className: 'stat-card' }, React.createElement('div', { className: 'stat-label' }, 'Paid'), React.createElement('div', { className: 'stat-value' }, `Rs. ${(+loan.amount_paid).toLocaleString()}`)),
      React.createElement('div', { className: 'stat-card' }, React.createElement('div', { className: 'stat-label' }, 'Remaining'), React.createElement('div', { className: 'stat-value' }, `Rs. ${(+loan.total_payable - +loan.amount_paid).toLocaleString()}`)),
      React.createElement('div', { className: 'stat-card' }, React.createElement('div', { className: 'stat-label' }, 'Status'), React.createElement('div', { className: 'stat-value' }, loan.status)),
    ),
    loan.status === 'active' ? React.createElement('div', { className: 'card' },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'Record Payment'),
      React.createElement('form', { onSubmit: handlePay, className: 'flex gap-8' },
        React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', style: { maxWidth: 200 }, placeholder: 'Amount', value: amount, onChange: e => setAmount(e.target.value), required: true }),
        React.createElement('button', { type: 'submit', className: 'btn btn-success' }, 'Record Payment')
      )
    ) : null,
    React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'Payment History'),
      loan.payments && loan.payments.length > 0
        ? React.createElement('div', { className: 'table-wrapper' },
            React.createElement('table', { className: 'data-table' },
              React.createElement('thead', null, React.createElement('tr', null, ['Date','Amount','Description'].map(h => React.createElement('th', { key: h }, h)))),
              React.createElement('tbody', null, loan.payments.map(p => React.createElement('tr', { key: p.id },
                React.createElement('td', null, p.transaction_date),
                React.createElement('td', null, `Rs. ${(+p.amount).toLocaleString()}`),
                React.createElement('td', null, p.description || '-')
              )))
            )
          )
        : React.createElement('p', { className: 'text-muted' }, 'No payments yet')
    )
  );
}

function AdminFines({ navigate }) {
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ member_id: '', amount: '', reason: '', fine_date: new Date().toISOString().slice(0,10) });
  const [members, setMembers] = useState([]);
  const toast = useToast();
  const load = () => API.get('fines').then(setData).catch(e => toast.error(e.message));
  useEffect(() => { load(); API.get('members').then(setMembers).catch(() => {}); }, []);
  const handleSave = async e => {
    e.preventDefault();
    try { await API.post('fines', form); toast.success('Fine created'); setShowModal(false); load(); } catch (e) { toast.error(e.message); }
  };
  const handlePay = async (id) => {
    try { await API.put('fines', { paid_date: new Date().toISOString().slice(0,10) }, { id, type: 'pay' }); toast.success('Fine paid'); load(); } catch (e) { toast.error(e.message); }
  };
  const handleAuto = async () => {
    try { const d = await API.post('fines', {}, { id: 'apply-auto' }); toast.success(d.message); load(); } catch (e) { toast.error(e.message); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this fine?')) return;
    try { await API.del('fines', { id }); toast.success('Deleted'); load(); } catch (e) { toast.error(e.message); }
  };
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Fines'),
      React.createElement('div', { className: 'flex gap-8' },
        React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: handleAuto }, 'Apply Auto Fines'),
        React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => { setForm({ member_id: '', amount: '', reason: '', fine_date: new Date().toISOString().slice(0,10) }); setShowModal(true); } }, '+ Add Fine')
      )
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['ID','Member','Amount','Reason','Date','Status','Actions'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            data.map(f => React.createElement('tr', { key: f.id },
              React.createElement('td', null, f.id),
              React.createElement('td', null, f.full_name || `Member #${f.member_id}`),
              React.createElement('td', null, `Rs. ${(+f.amount).toLocaleString()}`),
              React.createElement('td', null, f.reason || '-'),
              React.createElement('td', null, f.fine_date),
              React.createElement('td', null, React.createElement('span', { className: `badge ${f.is_paid ? 'badge-success' : 'badge-danger'}` }, f.is_paid ? 'Paid' : 'Unpaid')),
              React.createElement('td', null,
                React.createElement('div', { className: 'actions' },
                  !f.is_paid ? React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => handlePay(f.id) }, 'Pay') : null,
                  React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => handleDelete(f.id) }, 'Del')
                )
              )
            ))
          )
        )
      )
    ),
    showModal ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setShowModal(false) },
      React.createElement('div', { className: 'modal' },
        React.createElement('h3', null, 'Add Fine'),
        React.createElement('form', { onSubmit: handleSave },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Member *'),
            React.createElement('select', { className: 'form-control', value: form.member_id, onChange: e => setForm(f => ({...f, member_id: e.target.value})), required: true },
              React.createElement('option', { value: '' }, 'Select member'),
              members.map(m => React.createElement('option', { key: m.id, value: m.id }, `${m.member_id} - ${m.full_name}`))
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Amount *'),
              React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.amount, onChange: e => setForm(f => ({...f, amount: e.target.value})), required: true })
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Date'),
              React.createElement('input', { type: 'date', className: 'form-control', value: form.fine_date, onChange: e => setForm(f => ({...f, fine_date: e.target.value})) })
            )
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Reason'),
            React.createElement('textarea', { className: 'form-control', value: form.reason, onChange: e => setForm(f => ({...f, reason: e.target.value})) })
          ),
          React.createElement('div', { className: 'modal-actions' },
            React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => setShowModal(false) }, 'Cancel'),
            React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Create')
          )
        )
      )
    ) : null
  );
}

function AdminTransactions({ navigate }) {
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ member_id: '', type: 'deposit', amount: '', description: '', transaction_date: new Date().toISOString().slice(0,10) });
  const toast = useToast();
  const load = () => { API.get('transactions').then(setData).catch(e => toast.error(e.message)); };
  useEffect(() => { load(); API.get('members').then(setMembers).catch(() => {}); }, []);
  const handleSave = async e => {
    e.preventDefault();
    try {
      await API.post('transactions', form);
      toast.success('Transaction created');
      setShowModal(false);
      setForm({ member_id: '', type: 'deposit', amount: '', description: '', transaction_date: new Date().toISOString().slice(0,10) });
      load();
    } catch (e) { toast.error(e.message); }
  };
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Transactions'),
      React.createElement('div', { className: 'flex gap-8' },
        React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => { setForm({ member_id: '', type: 'deposit', amount: '', description: '', transaction_date: new Date().toISOString().slice(0,10) }); setShowModal(true); } }, '+ Add Transaction'),
        React.createElement('a', { className: 'btn btn-outline btn-sm', href: `api.php?action=transactions&id=export&type=csv`, target: '_blank' }, 'CSV'),
        React.createElement('a', { className: 'btn btn-outline btn-sm', href: `api.php?action=transactions&id=export&type=pdf`, target: '_blank' }, 'PDF')
      )
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['ID','Type','Amount','Description','Date','Member','Created By'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            data.map(t => React.createElement('tr', { key: t.id },
              React.createElement('td', null, t.id),
              React.createElement('td', null, React.createElement('span', { className: `badge badge-${t.type === 'deposit' || t.type === 'opening_balance' ? 'success' : t.type === 'loan_issued' || t.type === 'loan_payment' || t.type === 'fine_paid' || t.type === 'adjustment' ? 'info' : 'warning'}` }, t.type)),
              React.createElement('td', null, `Rs. ${(+t.amount).toLocaleString()}`),
              React.createElement('td', { className: 'truncate', style: { maxWidth: 200 } }, t.description || '-'),
              React.createElement('td', null, t.transaction_date),
              React.createElement('td', null, t.full_name || '-'),
              React.createElement('td', null, t.created_by_name || '-')
            ))
          )
        )
      )
    ),
    showModal ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setShowModal(false) },
      React.createElement('div', { className: 'modal' },
        React.createElement('h3', null, 'Add Transaction'),
        React.createElement('form', { onSubmit: handleSave },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Member *'),
            React.createElement('select', { className: 'form-control', value: form.member_id, onChange: e => setForm(f => ({...f, member_id: e.target.value})), required: true },
              React.createElement('option', { value: '' }, 'Select a member'),
              members.map(m => React.createElement('option', { key: m.id, value: m.id }, `${m.member_id} - ${m.full_name}`))
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Type *'),
              React.createElement('select', { className: 'form-control', value: form.type, onChange: e => setForm(f => ({...f, type: e.target.value})) },
                ['deposit','loan_payment','fine_paid','opening_balance','refund','adjustment'].map(t => React.createElement('option', { key: t, value: t }, t.replace(/_/g, ' ')))
              )
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Amount *'),
              React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.amount, onChange: e => setForm(f => ({...f, amount: e.target.value})), required: true })
            )
          ),
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Date *'),
              React.createElement('input', { type: 'date', className: 'form-control', value: form.transaction_date, onChange: e => setForm(f => ({...f, transaction_date: e.target.value})), required: true })
            ),
            React.createElement('div', { className: 'form-group', style: { flex: 1 } },
              React.createElement('label', { className: 'form-label' }, 'Description'),
              React.createElement('input', { className: 'form-control', value: form.description, onChange: e => setForm(f => ({...f, description: e.target.value})), placeholder: 'Optional note' })
            )
          ),
          React.createElement('div', { className: 'modal-actions' },
            React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => setShowModal(false) }, 'Cancel'),
            React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Create')
          )
        )
      )
    ) : null
  );
}

function AdminReports({ navigate }) {
  const [summary, setSummary] = useState([]);
  const [income, setIncome] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterType, setFilterType] = useState('');
  const toast = useToast();
  useEffect(() => {
    API.get('transactions', { type: 'summary' }).then(setSummary).catch(e => toast.error(e.message));
    API.get('income').then(setIncome).catch(e => toast.error(e.message));
  }, []);
  const months = [...new Set(summary.map(s => s.month))].sort().reverse();
  const types = [...new Set(summary.map(s => s.type))].sort();
  const filteredSummary = summary.filter(s => (!filterMonth || s.month === filterMonth) && (!filterType || s.type === filterType));
  const filteredInterest = income ? (filterMonth ? income.interest.filter(r => r.month === filterMonth) : income.interest) : [];
  const filteredFines = income ? (filterMonth ? income.fines.filter(r => r.month === filterMonth) : income.fines) : [];
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Reports'),
      React.createElement('div', { className: 'flex gap-8' },
        React.createElement('select', { className: 'form-control', style: { width: 200 }, value: filterMonth, onChange: e => setFilterMonth(e.target.value) },
          React.createElement('option', { value: '' }, 'सबै महिना (All Months)'),
          months.map(m => React.createElement('option', { key: m, value: m }, adMonthToBsLabel(m)))
        ),
        React.createElement('select', { className: 'form-control', style: { width: 160 }, value: filterType, onChange: e => setFilterType(e.target.value) },
          React.createElement('option', { value: '' }, 'सबै प्रकार (All Types)'),
          types.map(t => React.createElement('option', { key: t, value: t }, t))
        ),
        React.createElement('a', { className: 'btn btn-outline btn-sm', href: `api.php?action=transactions&id=export&type=csv`, target: '_blank' }, 'CSV Export')
      )
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'Monthly Summary'),
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['Month','Type','Total'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            filteredSummary.length === 0
              ? React.createElement('tr', null, React.createElement('td', { colSpan: 3, style: { textAlign: 'center', color: '#94a3b8' } }, 'No data for selected filters'))
              : filteredSummary.map((s, i) => React.createElement('tr', { key: i },
                  React.createElement('td', null, adMonthToBsLabel(s.month)),
                  React.createElement('td', null, s.type),
                  React.createElement('td', null, `Rs. ${(+s.total).toLocaleString()}`)
                ))
          )
        )
      )
    ),
    income ? React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'Income Report'),
      React.createElement('h4', null, 'Interest Collected'),
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['Month','Amount'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            filteredInterest.length === 0
              ? React.createElement('tr', null, React.createElement('td', { colSpan: 2, style: { textAlign: 'center', color: '#94a3b8' } }, 'No data'))
              : filteredInterest.map((r, i) => React.createElement('tr', { key: i },
                  React.createElement('td', null, adMonthToBsLabel(r.month)),
                  React.createElement('td', null, `Rs. ${(+r.total).toLocaleString()}`)
                ))
          )
        )
      ),
      React.createElement('h4', { style: { marginTop: 16 } }, 'Fines Collected'),
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['Month','Amount'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            filteredFines.length === 0
              ? React.createElement('tr', null, React.createElement('td', { colSpan: 2, style: { textAlign: 'center', color: '#94a3b8' } }, 'No data'))
              : filteredFines.map((r, i) => React.createElement('tr', { key: i },
                  React.createElement('td', null, adMonthToBsLabel(r.month)),
                  React.createElement('td', null, `Rs. ${(+r.total).toLocaleString()}`)
                ))
          )
        )
      )
    ) : null
  );
}

function AdminSettings({ navigate }) {
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({});
  const [seeded, setSeeded] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const toast = useToast();
  const handleChangePwd = async e => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) return toast.error('Passwords do not match');
    if (pwdForm.new_password.length < 6) return toast.error('Password must be at least 6 characters');
    setPwdLoading(true);
    try {
      await API.put('change-password', { old_password: pwdForm.old_password, new_password: pwdForm.new_password });
      toast.success('Password changed successfully');
      setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (e) { toast.error(e.message); }
    finally { setPwdLoading(false); }
  };
  useEffect(() => {
    API.get('dashboard', { type: 'settings' }).then(d => { setSettings(d); setForm({...d}); }).catch(e => toast.error(e.message));
    API.get('seed').then(r => setSeeded(r.seeded)).catch(() => {});
  }, []);
  const handleSave = async e => {
    e.preventDefault();
    try { await API.put('settings-update', form); toast.success('Settings updated'); } catch (e) { toast.error(e.message); }
  };
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const r = await API.post('seed', {});
      toast.success(r.message);
      setSeeded(true);
    } catch (e) { toast.error(e.message); }
    finally { setSeeding(false); }
  };
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Settings')
    ),
    React.createElement('div', { className: 'card', style: { maxWidth: 500 } },
      React.createElement('form', { onSubmit: handleSave },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Monthly Deposit Amount'),
          React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.monthly_deposit_amount || '', onChange: e => setForm(f => ({...f, monthly_deposit_amount: e.target.value})) })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Fine Amount'),
          React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.fine_amount || '', onChange: e => setForm(f => ({...f, fine_amount: e.target.value})) })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Fine Grace Days'),
          React.createElement('input', { type: 'number', className: 'form-control', value: form.fine_grace_day || '', onChange: e => setForm(f => ({...f, fine_grace_day: e.target.value})) })
        ),
        React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Save Settings')
      )
    ),
    seeded !== null ? React.createElement('div', { className: 'card', style: { maxWidth: 500, marginTop: 16 } },
      React.createElement('h3', { style: { marginBottom: 12 } }, 'Sample Data'),
      React.createElement('p', { className: 'text-muted text-sm' }, seeded
        ? 'Sample data (5 members, deposits, loans, fines, transactions) already exists.'
        : 'No sample data found. Click below to create sample members and transactions for testing.'
      ),
      React.createElement('button', {
        className: 'btn btn-outline',
        style: { marginTop: 8 },
        onClick: handleSeed,
        disabled: seeding || seeded
      }, seeding ? 'Seeding...' : seeded ? 'Already Seeded' : 'Seed Sample Data')
      ) : null,
    React.createElement('div', { className: 'card', style: { maxWidth: 500, marginTop: 16 } },
      React.createElement('h3', { style: { marginBottom: 12 } }, 'Change Password'),
      React.createElement('form', { onSubmit: handleChangePwd },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Current Password'),
          React.createElement('input', { type: 'password', className: 'form-control', value: pwdForm.old_password, onChange: e => setPwdForm(f => ({...f, old_password: e.target.value})), required: true })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'New Password'),
          React.createElement('input', { type: 'password', className: 'form-control', value: pwdForm.new_password, onChange: e => setPwdForm(f => ({...f, new_password: e.target.value})), required: true, minLength: 6 })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Confirm New Password'),
          React.createElement('input', { type: 'password', className: 'form-control', value: pwdForm.confirm_password, onChange: e => setPwdForm(f => ({...f, confirm_password: e.target.value})), required: true })
        ),
        React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: pwdLoading }, pwdLoading ? 'Changing...' : 'Change Password')
      )
    )
  );
}

function AdminOldTransactions({ navigate }) {
  const [members, setMembers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ member_id: '', type: 'deposit', amount: '', transaction_date: new Date().toISOString().slice(0,10), description: '' });
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState({ deposits: 0, fines: 0, interest: 0, total: 0 });
  const toast = useToast();
  const loadEntries = () => {
    API.get('transactions').then(d => {
      setEntries(d);
      const sums = { deposits: 0, fines: 0, interest: 0, total: 0 };
      d.forEach(t => {
        const amt = +t.amount || 0;
        sums.total += amt;
        if (t.type === 'deposit') sums.deposits += amt;
        else if (t.type === 'fine_applied' || t.type === 'fine_paid') sums.fines += amt;
        else if (t.type === 'interest') sums.interest += amt;
      });
      setSummary(sums);
    }).catch(e => toast.error(e.message));
  };
  useEffect(() => {
    loadEntries();
    API.get('members').then(setMembers).catch(() => {});
  }, []);
  const handleAdd = async e => {
    e.preventDefault();
    try {
      const typeMap = { fine: 'fine_applied', deposit: 'deposit', interest: 'interest', loan_payment: 'loan_payment', adjustment: 'adjustment' };
      await API.post('transactions', { ...form, type: typeMap[form.type] || form.type });
      toast.success('Entry added');
      setForm({ member_id: '', type: 'deposit', amount: '', transaction_date: new Date().toISOString().slice(0,10), description: '' });
      loadEntries();
    } catch (e) { toast.error(e.message); }
  };
  const downloadTemplate = () => {
    const csv = 'member_code,type,amount,date,description\nM0001,deposit,1000,2024-06-15,Monthly deposit\nM0002,fine,50,2024-08-01,Late fee\nM0003,interest,200,2024-07-15,Loan interest';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaction_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return toast.error('Select a CSV file');
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('api.php?action=transactions&id=import-csv', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      toast.success(data.message);
      setShowImport(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadEntries();
    } catch (e) { toast.error(e.message); }
    finally { setImporting(false); }
  };
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Old Transactions'),
      React.createElement('div', { className: 'flex gap-8' },
        React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: downloadTemplate }, 'Download CSV Template'),
        React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: () => setShowImport(true) }, 'Import CSV'),
      )
    ),
    React.createElement('div', { className: 'stats-grid' },
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Total Deposits'),
        React.createElement('div', { className: 'stat-value', style: { color: '#059669' } }, `Rs. ${summary.deposits.toLocaleString()}`)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Total Fines'),
        React.createElement('div', { className: 'stat-value', style: { color: '#dc2626' } }, `Rs. ${summary.fines.toLocaleString()}`)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Total Interest'),
        React.createElement('div', { className: 'stat-value', style: { color: '#7c3aed' } }, `Rs. ${summary.interest.toLocaleString()}`)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Grand Total'),
        React.createElement('div', { className: 'stat-value', style: { color: '#1e40af' } }, `Rs. ${summary.total.toLocaleString()}`)
      )
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'Add Old Entry'),
      React.createElement('form', { onSubmit: handleAdd, className: 'flex gap-8', style: { flexWrap: 'wrap', alignItems: 'flex-end' } },
        React.createElement('div', { className: 'form-group', style: { flex: '1 1 180px' } },
          React.createElement('label', { className: 'form-label' }, 'Member *'),
          React.createElement('select', { className: 'form-control', value: form.member_id, onChange: e => setForm(f => ({...f, member_id: e.target.value})), required: true },
            React.createElement('option', { value: '' }, 'Select member'),
            members.map(m => React.createElement('option', { key: m.id, value: m.id }, `${m.member_id} - ${m.full_name}`))
          )
        ),
        React.createElement('div', { className: 'form-group', style: { flex: '1 1 130px' } },
          React.createElement('label', { className: 'form-label' }, 'Type *'),
          React.createElement('select', { className: 'form-control', value: form.type, onChange: e => setForm(f => ({...f, type: e.target.value})) },
            ['deposit','fine','interest','loan_payment','adjustment'].map(t => React.createElement('option', { key: t, value: t }, t))
          )
        ),
        React.createElement('div', { className: 'form-group', style: { flex: '1 1 120px' } },
          React.createElement('label', { className: 'form-label' }, 'Amount *'),
          React.createElement('input', { type: 'number', step: '0.01', className: 'form-control', value: form.amount, onChange: e => setForm(f => ({...f, amount: e.target.value})), required: true })
        ),
        React.createElement('div', { className: 'form-group', style: { flex: '1 1 140px' } },
          React.createElement('label', { className: 'form-label' }, 'Date *'),
          React.createElement('input', { type: 'date', className: 'form-control', value: form.transaction_date, onChange: e => setForm(f => ({...f, transaction_date: e.target.value})), required: true })
        ),
        React.createElement('div', { className: 'form-group', style: { flex: '2 1 180px' } },
          React.createElement('label', { className: 'form-label' }, 'Description'),
          React.createElement('input', { className: 'form-control', value: form.description, onChange: e => setForm(f => ({...f, description: e.target.value})), placeholder: 'Optional note' })
        ),
        React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Add Entry')
      )
    ),
    React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'All Entries'),
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['ID','Member','Type','Amount','Date','Description'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            entries.length === 0
              ? React.createElement('tr', null, React.createElement('td', { colSpan: 6, style: { textAlign: 'center', color: '#94a3b8' } }, 'No entries yet'))
              : entries.map(t => React.createElement('tr', { key: t.id },
                  React.createElement('td', null, t.id),
                  React.createElement('td', null, t.full_name || '-'),
                  React.createElement('td', null, React.createElement('span', { className: `badge badge-${t.type === 'deposit' || t.type === 'opening_balance' ? 'success' : t.type === 'interest' ? 'warning' : 'info'}` }, t.type)),
                  React.createElement('td', null, `Rs. ${(+t.amount).toLocaleString()}`),
                  React.createElement('td', null, t.transaction_date),
                  React.createElement('td', null, t.description || '-')
                ))
          )
        )
      )
    ),
    showImport ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setShowImport(false) },
      React.createElement('div', { className: 'modal' },
        React.createElement('h3', null, 'Import Transactions from CSV'),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Template'),
          React.createElement('button', { type: 'button', className: 'btn btn-outline btn-sm', onClick: downloadTemplate }, 'Download Template CSV')
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'CSV File *'),
          React.createElement('input', { type: 'file', accept: '.csv', ref: fileInputRef, className: 'form-control', style: { padding: 8 } }),
          React.createElement('p', { className: 'text-muted text-sm mt-4' }, 'Columns: member_code, type, amount, date, description. Types: deposit, fine, interest, loan_payment, adjustment')
        ),
        React.createElement('div', { className: 'modal-actions' },
          React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => { setShowImport(false); if (fileInputRef.current) fileInputRef.current.value = ''; } }, 'Cancel'),
          React.createElement('button', { type: 'button', className: 'btn btn-primary', onClick: handleImport, disabled: importing }, importing ? 'Importing...' : 'Import')
        )
      )
    ) : null
  );
}

function AdminPasswordResets({ navigate }) {
  const [requests, setRequests] = useState([]);
  const [approveId, setApproveId] = useState(null);
  const [tempPwd, setTempPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const load = () => API.get('password-reset').then(setRequests).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const handleApprove = async id => {
    if (!tempPwd || tempPwd.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await API.post('password-reset', { temporary_password: tempPwd }, { id, type: 'approve' });
      toast.success('Password reset approved');
      setApproveId(null);
      setTempPwd('');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  const handleReject = async id => {
    if (!confirm('Reject this password reset request?')) return;
    try {
      await API.post('password-reset', {}, { id, type: 'reject' });
      toast.success('Request rejected');
      load();
    } catch (e) { toast.error(e.message); }
  };
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'Password Reset Requests')
    ),
    React.createElement('div', { className: 'card' },
      requests.length === 0
        ? React.createElement('p', { className: 'text-muted', style: { textAlign: 'center', padding: 32 } }, 'No pending password reset requests')
        : React.createElement('div', { className: 'table-wrapper' },
            React.createElement('table', { className: 'data-table' },
              React.createElement('thead', null, React.createElement('tr', null, ['ID','Member','Member ID','Requested','Actions'].map(h => React.createElement('th', { key: h }, h)))),
              React.createElement('tbody', null,
                requests.map(r => React.createElement('tr', { key: r.id },
                  React.createElement('td', null, r.id),
                  React.createElement('td', null, r.full_name),
                  React.createElement('td', null, r.member_id),
                  React.createElement('td', null, r.requested_at),
                  React.createElement('td', null,
                    React.createElement('div', { className: 'actions' },
                      React.createElement('button', { className: 'btn btn-success btn-sm', onClick: () => { setApproveId(r.id); setTempPwd(''); } }, 'Approve'),
                      React.createElement('button', { className: 'btn btn-danger btn-sm', onClick: () => handleReject(r.id) }, 'Reject')
                    )
                  )
                ))
              )
            )
          )
    ),
    approveId ? React.createElement('div', { className: 'modal-overlay', onClick: e => e.target.className === 'modal-overlay' && setApproveId(null) },
      React.createElement('div', { className: 'modal', style: { maxWidth: 400 } },
        React.createElement('h3', null, 'Approve Password Reset'),
        React.createElement('p', { className: 'text-muted text-sm mt-4' }, 'Set a temporary password for the member. They will use this to log in and can change it later.'),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Temporary Password *'),
          React.createElement('input', { type: 'text', className: 'form-control', value: tempPwd, onChange: e => setTempPwd(e.target.value), placeholder: 'e.g. temp123', required: true })
        ),
        React.createElement('div', { className: 'modal-actions' },
          React.createElement('button', { type: 'button', className: 'btn btn-outline', onClick: () => setApproveId(null) }, 'Cancel'),
          React.createElement('button', { type: 'button', className: 'btn btn-success', onClick: () => handleApprove(approveId), disabled: loading }, loading ? 'Approving...' : 'Approve')
        )
      )
    ) : null
  );
}

// ===== MEMBER PAGES =====
function MemberDashboard({ navigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const toast = useToast();
  useEffect(() => {
    Promise.all([
      API.get('dashboard', { type: 'alerts' }),
      API.get('members', { id: user.id, type: 'summary' })
    ]).then(([alerts, summary]) => setData({ alerts, summary })).catch(e => toast.error(e.message));
  }, []);
  if (!data) return React.createElement(LoadingPage);
  return React.createElement('div', null,
    React.createElement('div', { className: 'stats-grid' },
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Total Deposits'),
        React.createElement('div', { className: 'stat-value', style: { color: '#059669' } }, `Rs. ${(data.summary.total_deposits || 0).toLocaleString()}`)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Active Loans'),
        React.createElement('div', { className: 'stat-value' }, data.summary.active_loans || 0)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Unpaid Fines'),
        React.createElement('div', { className: 'stat-value', style: { color: '#dc2626' } }, data.summary.unpaid_fines || 0)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Balance'),
        React.createElement('div', { className: 'stat-value', style: { color: '#1e40af' } }, `Rs. ${(data.summary.balance || 0).toLocaleString()}`)
      )
    ),
    data.alerts.unpaid_deposits.length > 0 || data.alerts.unpaid_fines.length > 0
      ? React.createElement('div', { className: 'alert alert-warning' }, `⚠️ You have ${data.alerts.unpaid_deposits.length} unpaid deposits and ${data.alerts.unpaid_fines.length} unpaid fines`)
      : React.createElement('div', { className: 'alert alert-success' }, '✅ All up to date!')
  );
}

function MemberDeposits({ navigate }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const toast = useToast();
  useEffect(() => { API.get('deposits', { member_id: user.id }).then(setData).catch(e => toast.error(e.message)); }, []);
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' }, React.createElement('h2', null, 'My Deposits')),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['Month','Amount','Status','Paid Date','Notes'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            data.map(d => React.createElement('tr', { key: d.id },
              React.createElement('td', null, d.deposit_month),
              React.createElement('td', null, `Rs. ${(+d.amount).toLocaleString()}`),
              React.createElement('td', null, React.createElement('span', { className: `badge ${d.status === 'paid' ? 'badge-success' : 'badge-danger'}` }, d.status)),
              React.createElement('td', null, d.paid_date || '-'),
              React.createElement('td', null, d.notes || '-')
            ))
          )
        )
      )
    )
  );
}

function MemberLoans({ navigate }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const toast = useToast();
  useEffect(() => { API.get('loans', { member_id: user.id }).then(setData).catch(e => toast.error(e.message)); }, []);
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' }, React.createElement('h2', null, 'My Loans')),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['Amount','Interest','Total Payable','Paid','Remaining','Status'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            data.map(l => React.createElement('tr', { key: l.id },
              React.createElement('td', null, `Rs. ${(+l.loan_amount).toLocaleString()}`),
              React.createElement('td', null, `${l.interest_rate}%`),
              React.createElement('td', null, `Rs. ${(+l.total_payable).toLocaleString()}`),
              React.createElement('td', null, `Rs. ${(+l.amount_paid).toLocaleString()}`),
              React.createElement('td', null, `Rs. ${(+l.total_payable - +l.amount_paid).toLocaleString()}`),
              React.createElement('td', null, React.createElement('span', { className: `badge ${l.status === 'active' ? 'badge-warning' : 'badge-success'}` }, l.status))
            ))
          )
        )
      )
    )
  );
}

function MemberFines({ navigate }) {
  const { user } = useAuth();
  const [fines, setFines] = useState([]);
  const [txns, setTxns] = useState([]);
  const toast = useToast();
  useEffect(() => {
    API.get('fines', { member_id: user.id }).then(setFines).catch(e => toast.error(e.message));
    API.get('transactions', { member_id: user.id }).then(setTxns).catch(e => toast.error(e.message));
  }, []);
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' }, React.createElement('h2', null, 'Fines & Transactions')),
    React.createElement('div', { className: 'card' },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'My Fines'),
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['Amount','Reason','Date','Status'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            fines.map(f => React.createElement('tr', { key: f.id },
              React.createElement('td', null, `Rs. ${(+f.amount).toLocaleString()}`),
              React.createElement('td', null, f.reason || '-'),
              React.createElement('td', null, f.fine_date),
              React.createElement('td', null, React.createElement('span', { className: `badge ${f.is_paid ? 'badge-success' : 'badge-danger'}` }, f.is_paid ? 'Paid' : 'Unpaid'))
            ))
          )
        )
      )
    ),
    React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'My Transactions'),
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['Type','Amount','Description','Date'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            txns.map(t => React.createElement('tr', { key: t.id },
              React.createElement('td', null, React.createElement('span', { className: `badge badge-info` }, t.type)),
              React.createElement('td', null, `Rs. ${(+t.amount).toLocaleString()}`),
              React.createElement('td', null, t.description || '-'),
              React.createElement('td', null, t.transaction_date)
            ))
          )
        )
      )
    )
  );
}

function MemberReports({ navigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const toast = useToast();
  useEffect(() => {
    Promise.all([
      API.get('transactions', { member_id: user.id }),
      API.get('members', { id: user.id, type: 'summary' })
    ]).then(([txns, summary]) => setData({ txns, summary })).catch(e => toast.error(e.message));
  }, []);
  const exportCSV = () => {
    if (!data) return;
    const rows = data.txns.map(t => `${t.id},${t.type},${t.amount},${t.description || ''},${t.transaction_date}`);
    const csv = 'ID,Type,Amount,Description,Date\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  if (!data) return React.createElement(LoadingPage);
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-header' },
      React.createElement('h2', null, 'My Reports'),
      React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: exportCSV }, 'Export CSV')
    ),
    React.createElement('div', { className: 'stats-grid' },
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Total Deposits'),
        React.createElement('div', { className: 'stat-value', style: { color: '#059669' } }, `Rs. ${(data.summary.total_deposits || 0).toLocaleString()}`)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Active Loans'),
        React.createElement('div', { className: 'stat-value' }, data.summary.active_loans || 0)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Unpaid Fines'),
        React.createElement('div', { className: 'stat-value', style: { color: '#dc2626' } }, data.summary.unpaid_fines || 0)
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-label' }, 'Current Balance'),
        React.createElement('div', { className: 'stat-value', style: { color: '#1e40af' } }, `Rs. ${(data.summary.balance || 0).toLocaleString()}`)
      )
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('h3', { style: { marginBottom: 16 } }, 'Transaction History'),
      React.createElement('div', { className: 'table-wrapper' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null, React.createElement('tr', null, ['ID','Type','Amount','Description','Date'].map(h => React.createElement('th', { key: h }, h)))),
          React.createElement('tbody', null,
            data.txns.length === 0
              ? React.createElement('tr', null, React.createElement('td', { colSpan: 5, style: { textAlign: 'center', color: '#94a3b8' } }, 'No transactions yet'))
              : data.txns.map(t => React.createElement('tr', { key: t.id },
                  React.createElement('td', null, t.id),
                  React.createElement('td', null, React.createElement('span', { className: `badge badge-${t.type === 'deposit' || t.type === 'opening_balance' ? 'success' : t.type === 'loan_issued' || t.type === 'loan_payment' || t.type === 'fine_paid' || t.type === 'adjustment' ? 'info' : 'warning'}` }, t.type)),
                  React.createElement('td', null, `Rs. ${(+t.amount).toLocaleString()}`),
                  React.createElement('td', null, t.description || '-'),
                  React.createElement('td', null, adDateToBsLabel(t.transaction_date))
                ))
          )
        )
      )
    )
  );
}

// ===== ROUTER =====
function App() {
  const { user, logout, loading } = useAuth();
  const { hash, navigate } = useRouter();
  const toast = useToast();

  if (loading && hash !== '/login') return React.createElement(LoadingPage);

  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  // Route matching
  const route = (path, adminOnly, memberOnly, component) => {
    const match = hash === path || hash.startsWith(path + '/') || hash.startsWith(path + '?');
    if (!match) return null;
    if (adminOnly && !user) { navigate('/login'); return null; }
    if (adminOnly && !isAdmin) { navigate('/member'); return null; }
    if (memberOnly && !user) { navigate('/login'); return null; }
    if (memberOnly && isAdmin) { navigate('/admin'); return null; }
    return component;
  };

  let page = null;

  // Public routes
  if (hash === '/home' || hash === '/') page = React.createElement(HomePage, { navigate });
  else if (hash === '/login') page = user ? React.createElement(React.Fragment, null,
    (() => { navigate(isAdmin ? '/admin' : '/member'); return null; })()
  ) : React.createElement(LoginPage, { navigate });

  // Admin routes
  else if (hash.startsWith('/admin')) {
    if (!user) { navigate('/login'); return null; }
    if (!isAdmin) { navigate('/member'); return null; }
    let content;
    if (hash === '/admin' || hash === '/admin/') content = React.createElement(AdminDashboard, { navigate });
    else if (hash === '/admin/members') content = React.createElement(AdminMembers, { navigate });
    else if (hash === '/admin/deposits') content = React.createElement(AdminDeposits, { navigate });
    else if (hash === '/admin/loans') content = React.createElement(AdminLoans, { navigate });
    else if (hash.startsWith('/admin/loans/')) {
      const id = hash.split('/')[3];
      content = React.createElement(AdminLoanDetail, { navigate, id });
    } else if (hash === '/admin/fines') content = React.createElement(AdminFines, { navigate });
    else if (hash === '/admin/transactions') content = React.createElement(AdminTransactions, { navigate });
    else if (hash === '/admin/old-transactions') content = React.createElement(AdminOldTransactions, { navigate });
    else if (hash === '/admin/password-resets') content = React.createElement(AdminPasswordResets, { navigate });
    else if (hash === '/admin/reports') content = React.createElement(AdminReports, { navigate });
    else if (hash === '/admin/settings') content = React.createElement(AdminSettings, { navigate });
    else content = React.createElement('div', { className: 'alert alert-warning' }, 'Page not found');
    page = React.createElement(ProtectedLayout, { user, logout, navigate, hash }, content);
  }

  // Member routes
  else if (hash.startsWith('/member')) {
    if (!user) { navigate('/login'); return null; }
    if (isAdmin) { navigate('/admin'); return null; }
    let content;
    if (hash === '/member' || hash === '/member/') content = React.createElement(MemberDashboard, { navigate });
    else if (hash === '/member/deposits') content = React.createElement(MemberDeposits, { navigate });
    else if (hash === '/member/loans') content = React.createElement(MemberLoans, { navigate });
    else if (hash === '/member/fines') content = React.createElement(MemberFines, { navigate });
    else if (hash === '/member/reports') content = React.createElement(MemberReports, { navigate });
    else content = React.createElement('div', { className: 'alert alert-warning' }, 'Page not found');
    page = React.createElement(ProtectedLayout, { user, logout, navigate, hash }, content);
  }

  // Fallback
  else { page = React.createElement(HomePage, { navigate }); }

  return page;
}
