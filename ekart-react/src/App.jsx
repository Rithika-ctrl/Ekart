import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Auth
import CustomerLogin    from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import ForgotPassword   from './pages/ForgotPassword';
import CustomerOtp      from './pages/CustomerOtp';
import ResetPassword    from './pages/ResetPassword';

// Shopping
import CustomerHome     from './pages/CustomerHome';
import ProductDetail    from './pages/ProductDetail';
import ViewCart         from './pages/ViewCart';
import Payment          from './pages/Payment';
import OrderSuccess     from './pages/OrderSuccess';

// Orders
import ViewOrders       from './pages/ViewOrders';
import TrackOrders      from './pages/TrackOrders';
import OrderHistory     from './pages/OrderHistory';

// Account
import Wishlist         from './pages/Wishlist';
import CustomerProfile  from './pages/CustomerProfile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login"                    element={<CustomerLogin />} />
        <Route path="/register"                 element={<CustomerRegister />} />
        <Route path="/customer/forgot-password" element={<ForgotPassword />} />
        <Route path="/customer/otp"             element={<CustomerOtp />} />
        <Route path="/customer/reset-password"  element={<ResetPassword />} />

        {/* Shopping */}
        <Route path="/home"                     element={<CustomerHome />} />
        <Route path="/product/:id"              element={<ProductDetail />} />
        <Route path="/cart"                     element={<ViewCart />} />
        <Route path="/payment"                  element={<Payment />} />
        <Route path="/order-success"            element={<OrderSuccess />} />

        {/* Orders */}
        <Route path="/orders"                   element={<ViewOrders />} />
        <Route path="/track"                    element={<TrackOrders />} />
        <Route path="/order-history"            element={<OrderHistory />} />

        {/* Account */}
        <Route path="/wishlist"                 element={<Wishlist />} />
        <Route path="/profile"                  element={<CustomerProfile />} />

        {/* Fallback */}
        <Route path="*"                         element={<CustomerLogin />} />
      </Routes>
    </BrowserRouter>
  );
}