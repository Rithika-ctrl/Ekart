import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Auth pages
import CustomerLogin    from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import ForgotPassword   from './pages/ForgotPassword';
import CustomerOtp      from './pages/CustomerOtp';
import ResetPassword    from './pages/ResetPassword';

// Main pages
import CustomerHome     from './pages/CustomerHome';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Auth ── */}
        <Route path="/login"                    element={<CustomerLogin />} />
        <Route path="/register"                 element={<CustomerRegister />} />
        <Route path="/customer/forgot-password" element={<ForgotPassword />} />
        <Route path="/customer/otp"             element={<CustomerOtp />} />
        <Route path="/customer/reset-password"  element={<ResetPassword />} />

        {/* ── Main ── */}
        <Route path="/home"                     element={<CustomerHome />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<CustomerLogin />} />
      </Routes>
    </BrowserRouter>
  );
}
