import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


// Customer Pages
import CustomerHome from "./pages/CustomerHome";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerRegister from "./pages/CustomerRegister";
import CustomerProfile from "./pages/CustomerProfile";
import CustomerViewProducts from "./pages/CustomerViewProducts";

// Product & Orders
import ProductDetail from "./pages/ProductDetail";
import OrderHistory from "./pages/OrderHistory";
import TrackOrders from "./pages/TrackOrders";
import OrderSuccess from "./pages/OrderSuccess";
import Payment from "./pages/Payment";

// Vendor Pages
import VendorHome from "./pages/VendorHome";
import VendorLogin from "./pages/VendorLogin";
import VendorRegister from "./pages/VendorRegister";
import VendorOrders from "./pages/VendorOrders";
import VendorSalesReport from "./pages/VendorSalesReport";
import AccessDenied from "./pages/403";
import NotFound from "./pages/404";

// Additional pages (routes added)
import ViewCart from "./pages/ViewCart";
import Wishlist from "./pages/Wishlist";
import ViewOrders from "./pages/ViewOrders";
import CustomerOtp from "./pages/CustomerOtp";
import CustomerForgotPassword from "./pages/CustomerForgotPassword";
import CustomerResetPassword from "./pages/CustomerResetPassword";
import VendorForgotPassword from "./pages/VendorForgotPassword";
import VendorResetPassword from "./pages/VendorResetPassword";
import VendorOtp from "./pages/VendorOtp";
import VendorStoreFront from "./pages/VendorStoreFront";
import VendorViewProducts from "./pages/VendorViewProducts";
import CustomerCoupons from "./pages/CustomerCoupons";
import CustomerRefundReport from "./pages/CustomerRefundReport";
import CustomerSecuritySettings from "./pages/CustomerSecuritySettings";
import AiAssistantWidget from "./pages/AiAssistantWidget";
import ChatWidget from "./pages/ChatWidget";

// Product Management
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";

function App() {
  return (
    <Router>
      <Routes>
        {/* ================= CUSTOMER ================= */}
        <Route path="/" element={<CustomerHome />} />
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/register" element={<CustomerRegister />} />
        <Route path="/profile" element={<CustomerProfile />} />
        <Route path="/products" element={<CustomerViewProducts />} />

        {/* ================= PRODUCT ================= */}
        <Route path="/product/:id" element={<ProductDetail />} />

        {/* Additional routes */}
        <Route path="/cart" element={<ViewCart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/view-orders" element={<ViewOrders />} />
        <Route path="/otp" element={<CustomerOtp />} />
        <Route path="/forgot-password" element={<CustomerForgotPassword />} />
        <Route path="/reset-password" element={<CustomerResetPassword />} />
        <Route path="/customer/forgot-password" element={<CustomerForgotPassword />} />
        <Route path="/customer/reset-password" element={<CustomerResetPassword />} />
        <Route path="/vendor/forgot-password" element={<VendorForgotPassword />} />
        <Route path="/vendor/reset-password" element={<VendorResetPassword />} />
        <Route path="/vendor/otp" element={<VendorOtp />} />
        <Route path="/vendor/storefront" element={<VendorStoreFront />} />
        <Route path="/vendor/view-products" element={<VendorViewProducts />} />
        <Route path="/coupons" element={<CustomerCoupons />} />
        <Route path="/refunds" element={<CustomerRefundReport />} />
        <Route path="/security-settings" element={<CustomerSecuritySettings />} />
        <Route path="/ai-assistant" element={<AiAssistantWidget />} />
        <Route path="/chat" element={<ChatWidget />} />

        {/* ================= ORDERS ================= */}
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/track" element={<TrackOrders />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/success" element={<OrderSuccess />} />

        {/* ================= VENDOR ================= */}
        <Route path="/vendor" element={<VendorHome />} />
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/register" element={<VendorRegister />} />
        <Route path="/vendor/products" element={<VendorViewProducts />} />
        <Route path="/403" element={<AccessDenied />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/vendor/orders" element={<VendorOrders />} />
        <Route path="/vendor/report" element={<VendorSalesReport />} />

        {/* ================= PRODUCT MGMT ================= */}
        <Route path="/vendor/add-product" element={<AddProduct />} />
        <Route path="/vendor/edit-product/:id" element={<EditProduct />} />
      </Routes>
    </Router>
  );
}

export default App;