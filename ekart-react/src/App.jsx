import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// ── Customer Pages ───────────────────────────────────────────────────────
import CustomerHome             from "./pages/CustomerHome";
import CustomerLogin            from "./pages/CustomerLogin";
import CustomerRegister         from "./pages/CustomerRegister";
import CustomerProfile          from "./pages/CustomerProfile";
import CustomerViewProducts     from "./pages/CustomerViewProducts";
import CustomerOtp              from "./pages/CustomerOtp";
import CustomerForgotPassword   from "./pages/CustomerForgotPassword";
import CustomerResetPassword    from "./pages/CustomerResetPassword";
import CustomerCoupons          from "./pages/CustomerCoupons";
import CustomerRefundReport     from "./pages/CustomerRefundReport";
import CustomerSecuritySettings from "./pages/CustomerSecuritySettings";

// ── Product & Search ─────────────────────────────────────────────────────
import ProductDetail            from "./pages/ProductDetail";
import Search                   from "./pages/Search";
import GuestBrowse              from "./pages/GuestBrowse";

// ── Cart & Wishlist ──────────────────────────────────────────────────────
import ViewCart                 from "./pages/ViewCart";
import Wishlist                 from "./pages/Wishlist";

// ── Orders ───────────────────────────────────────────────────────────────
import OrderHistory             from "./pages/OrderHistory";
import ViewOrders               from "./pages/ViewOrders";
import TrackOrders              from "./pages/TrackOrders";
import TrackSingleOrder         from "./pages/TrackSingleOrder";
import OrderSuccess             from "./pages/OrderSuccess";
import Payment                  from "./pages/Payment";
import RefundManagement         from "./pages/RefundManagement";

// ── Address ──────────────────────────────────────────────────────────────
import AddressPage              from "./pages/AddressPage";

// ── Spending ─────────────────────────────────────────────────────────────
import Spending                 from "./pages/Spending";
import MySpending               from "./pages/MySpending";
import UserSpending             from "./pages/UserSpending";

// ── Misc Customer ────────────────────────────────────────────────────────
import StockAlerts              from "./pages/StockAlerts";
import SecuritySettings         from "./pages/SecuritySettings";
import AiAssistantWidget        from "./pages/AiAssistantWidget";
import ChatWidget               from "./pages/ChatWidget";
import Policies                 from "./pages/Policies";
import Analytics                from "./pages/Analytics";

// ── Vendor Pages ─────────────────────────────────────────────────────────
import VendorHome               from "./pages/VendorHome";
import VendorLogin              from "./pages/VendorLogin";
import VendorRegister           from "./pages/VendorRegister";
import VendorOtp                from "./pages/VendorOtp";
import VendorForgotPassword     from "./pages/VendorForgotPassword";
import VendorResetPassword      from "./pages/VendorResetPassword";
import VendorOrders             from "./pages/VendorOrders";
import VendorSalesReport        from "./pages/VendorSalesReport";
import VendorStoreFront         from "./pages/VendorStoreFront";
import VendorViewProducts       from "./pages/VendorViewProducts";

// ── Product Management (Vendor) ──────────────────────────────────────────
import AddProduct               from "./pages/AddProduct";
import EditProduct              from "./pages/EditProduct";

// ── Admin Pages ──────────────────────────────────────────────────────────
import AdminLogin               from "./pages/AdminLogin";
import AdminHome                from "./pages/AdminHome";
import AdminAccounts            from "./pages/AdminAccounts";
import AdminCoupons             from "./pages/AdminCoupons";
import AdminContent             from "./pages/AdminContent";
import AdminDeliveryManagement  from "./pages/AdminDeliveryManagement";
import AdminPolicies            from "./pages/AdminPolicies";
import AdminRefunds             from "./pages/AdminRefunds";
import AdminReviewManagement    from "./pages/AdminReviewManagement";
import AdminSecurity            from "./pages/AdminSecurity";
import AdminUserSearch          from "./pages/AdminUserSearch";
import AdminViewProducts        from "./pages/AdminViewProducts";
import AdminWarehouse           from "./pages/AdminWarehouse";
import ContentManagement        from "./pages/ContentManagement";

// ── Delivery Pages ───────────────────────────────────────────────────────
import DeliveryLogin            from "./pages/DeliveryLogin";
import DeliveryHome             from "./pages/DeliveryHome";
import DeliveryRegister         from "./pages/DeliveryRegister";
import DeliveryOtp              from "./pages/DeliveryOtp";
import DeliveryPending          from "./pages/DeliveryPending";

// ── Email Preview Pages ──────────────────────────────────────────────────
import OrderEmail               from "./pages/OrderEmail";
import CancelEmail              from "./pages/CancelEmail";
import ShippedEmail             from "./pages/ShippedEmail";
import DeliveredEmail           from "./pages/DeliveredEmail";
import ReplacementEmail         from "./pages/ReplacementEmail";
import OtpEmail                 from "./pages/OtpEmail";
import BackInStockEmail         from "./pages/BackInStockEmail";
import StockAlertEmail          from "./pages/StockAlertEmail";
import DeliveryOtpEmail         from "./pages/DeliveryOtpEmail";

// ── Error Pages ──────────────────────────────────────────────────────────
import Home                     from "./pages/Home";
import AccessDenied             from "./pages/403";
import NotFound                 from "./pages/404";
import Blocked                  from "./pages/Blocked";
import Error                    from "./pages/Error";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* ═══════════════════ PUBLIC ═══════════════════ */}
          <Route path="/"                     element={<CustomerHome />} />
          <Route path="/home"                 element={<Home />} />
          <Route path="/login"                element={<CustomerLogin />} />
          <Route path="/register"             element={<CustomerRegister />} />
          <Route path="/otp"                  element={<CustomerOtp />} />
          <Route path="/forgot-password"      element={<CustomerForgotPassword />} />
          <Route path="/reset-password"       element={<CustomerResetPassword />} />
          <Route path="/customer/forgot-password" element={<CustomerForgotPassword />} />
          <Route path="/customer/reset-password"  element={<CustomerResetPassword />} />

          <Route path="/products"             element={<CustomerViewProducts />} />
          <Route path="/product/:id"          element={<ProductDetail />} />
          <Route path="/search"               element={<Search />} />
          <Route path="/browse"               element={<GuestBrowse />} />
          <Route path="/policies"             element={<Policies />} />

          {/* ═══════════════════ CUSTOMER (protected) ═════ */}
          <Route path="/profile"   element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />
          <Route path="/cart"      element={<ProtectedRoute allowedRoles={['customer']}><ViewCart /></ProtectedRoute>} />
          <Route path="/wishlist"  element={<ProtectedRoute allowedRoles={['customer']}><Wishlist /></ProtectedRoute>} />
          <Route path="/address"   element={<ProtectedRoute allowedRoles={['customer']}><AddressPage /></ProtectedRoute>} />
          <Route path="/payment"   element={<ProtectedRoute allowedRoles={['customer']}><Payment /></ProtectedRoute>} />
          <Route path="/success"   element={<ProtectedRoute allowedRoles={['customer']}><OrderSuccess /></ProtectedRoute>} />

          <Route path="/orders"          element={<ProtectedRoute allowedRoles={['customer']}><OrderHistory /></ProtectedRoute>} />
          <Route path="/view-orders"     element={<ProtectedRoute allowedRoles={['customer']}><ViewOrders /></ProtectedRoute>} />
          <Route path="/track"           element={<ProtectedRoute allowedRoles={['customer']}><TrackOrders /></ProtectedRoute>} />
          <Route path="/track/:id"       element={<ProtectedRoute allowedRoles={['customer']}><TrackSingleOrder /></ProtectedRoute>} />
          <Route path="/refunds"         element={<ProtectedRoute allowedRoles={['customer']}><CustomerRefundReport /></ProtectedRoute>} />
          <Route path="/refund-management" element={<ProtectedRoute allowedRoles={['customer']}><RefundManagement /></ProtectedRoute>} />

          <Route path="/coupons"              element={<ProtectedRoute allowedRoles={['customer']}><CustomerCoupons /></ProtectedRoute>} />
          <Route path="/spending"             element={<ProtectedRoute allowedRoles={['customer']}><Spending /></ProtectedRoute>} />
          <Route path="/my-spending"          element={<ProtectedRoute allowedRoles={['customer']}><MySpending /></ProtectedRoute>} />
          <Route path="/user-spending"        element={<ProtectedRoute allowedRoles={['customer']}><UserSpending /></ProtectedRoute>} />
          <Route path="/stock-alerts"         element={<ProtectedRoute allowedRoles={['customer']}><StockAlerts /></ProtectedRoute>} />
          <Route path="/security-settings"    element={<ProtectedRoute allowedRoles={['customer']}><SecuritySettings /></ProtectedRoute>} />
          <Route path="/customer/security"    element={<ProtectedRoute allowedRoles={['customer']}><CustomerSecuritySettings /></ProtectedRoute>} />
          <Route path="/ai-assistant"         element={<ProtectedRoute allowedRoles={['customer']}><AiAssistantWidget /></ProtectedRoute>} />
          <Route path="/chat"                 element={<ProtectedRoute allowedRoles={['customer']}><ChatWidget /></ProtectedRoute>} />
          <Route path="/analytics"            element={<ProtectedRoute allowedRoles={['customer']}><Analytics /></ProtectedRoute>} />

          {/* ═══════════════════ VENDOR ═══════════════════ */}
          <Route path="/vendor/login"           element={<VendorLogin />} />
          <Route path="/vendor/register"        element={<VendorRegister />} />
          <Route path="/vendor/otp"             element={<VendorOtp />} />
          <Route path="/vendor/forgot-password" element={<VendorForgotPassword />} />
          <Route path="/vendor/reset-password"  element={<VendorResetPassword />} />

          <Route path="/vendor"                 element={<ProtectedRoute allowedRoles={['vendor']} redirectTo="/vendor/login"><VendorHome /></ProtectedRoute>} />
          <Route path="/vendor/products"        element={<ProtectedRoute allowedRoles={['vendor']} redirectTo="/vendor/login"><VendorViewProducts /></ProtectedRoute>} />
          <Route path="/vendor/orders"          element={<ProtectedRoute allowedRoles={['vendor']} redirectTo="/vendor/login"><VendorOrders /></ProtectedRoute>} />
          <Route path="/vendor/report"          element={<ProtectedRoute allowedRoles={['vendor']} redirectTo="/vendor/login"><VendorSalesReport /></ProtectedRoute>} />
          <Route path="/vendor/storefront"      element={<ProtectedRoute allowedRoles={['vendor']} redirectTo="/vendor/login"><VendorStoreFront /></ProtectedRoute>} />
          <Route path="/vendor/add-product"     element={<ProtectedRoute allowedRoles={['vendor']} redirectTo="/vendor/login"><AddProduct /></ProtectedRoute>} />
          <Route path="/vendor/edit-product/:id" element={<ProtectedRoute allowedRoles={['vendor']} redirectTo="/vendor/login"><EditProduct /></ProtectedRoute>} />

          {/* ═══════════════════ ADMIN ════════════════════ */}
          <Route path="/admin/login"            element={<AdminLogin />} />

          <Route path="/admin"                  element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminHome /></ProtectedRoute>} />
          <Route path="/admin/accounts"         element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminAccounts /></ProtectedRoute>} />
          <Route path="/admin/coupons"          element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminCoupons /></ProtectedRoute>} />
          <Route path="/admin/content"          element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminContent /></ProtectedRoute>} />
          <Route path="/admin/content-management" element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><ContentManagement /></ProtectedRoute>} />
          <Route path="/admin/delivery"         element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminDeliveryManagement /></ProtectedRoute>} />
          <Route path="/admin/policies"         element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminPolicies /></ProtectedRoute>} />
          <Route path="/admin/refunds"          element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminRefunds /></ProtectedRoute>} />
          <Route path="/admin/reviews"          element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminReviewManagement /></ProtectedRoute>} />
          <Route path="/admin/security"         element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminSecurity /></ProtectedRoute>} />
          <Route path="/admin/users"            element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminUserSearch /></ProtectedRoute>} />
          <Route path="/admin/products"         element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminViewProducts /></ProtectedRoute>} />
          <Route path="/admin/warehouse"        element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login"><AdminWarehouse /></ProtectedRoute>} />

          {/* ═══════════════════ DELIVERY ═════════════════ */}
          <Route path="/delivery/login"         element={<DeliveryLogin />} />
          <Route path="/delivery/register"      element={<DeliveryRegister />} />
          <Route path="/delivery/otp"           element={<DeliveryOtp />} />

          <Route path="/delivery"               element={<ProtectedRoute allowedRoles={['delivery']} redirectTo="/delivery/login"><DeliveryHome /></ProtectedRoute>} />
          <Route path="/delivery/pending"       element={<ProtectedRoute allowedRoles={['delivery']} redirectTo="/delivery/login"><DeliveryPending /></ProtectedRoute>} />

          {/* ═══════════════════ EMAIL PREVIEWS ═══════════ */}
          <Route path="/email/order"            element={<OrderEmail />} />
          <Route path="/email/cancel"           element={<CancelEmail />} />
          <Route path="/email/shipped"          element={<ShippedEmail />} />
          <Route path="/email/delivered"        element={<DeliveredEmail />} />
          <Route path="/email/replacement"      element={<ReplacementEmail />} />
          <Route path="/email/otp"              element={<OtpEmail />} />
          <Route path="/email/back-in-stock"    element={<BackInStockEmail />} />
          <Route path="/email/stock-alert"      element={<StockAlertEmail />} />
          <Route path="/email/delivery-otp"     element={<DeliveryOtpEmail />} />

          {/* ═══════════════════ ERROR PAGES ══════════════ */}
          <Route path="/403"     element={<AccessDenied />} />
          <Route path="/blocked" element={<Blocked />} />
          <Route path="/error"   element={<Error />} />
          <Route path="*"        element={<NotFound />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
