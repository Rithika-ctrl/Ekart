import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

// Customer Pages
import CustomerHome from "./pages/CustomerHome";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerRegister from "./pages/CustomerRegister";
import CustomerProfile from "./pages/CustomerProfile";
import ViewProducts from "./pages/ViewProducts";

// Product & Orders
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import OrderHistory from "./pages/OrderHistory";
import TrackOrders from "./pages/TrackOrders";
import OrderSuccess from "./pages/OrderSuccess";
import Payment from "./pages/Payment";

// Vendor Pages
import VendorHome from "./pages/VendorHome";
import VendorLogin from "./pages/VendorLogin";
import VendorRegister from "./pages/VendorRegister";
import VendorProducts from "./pages/VendorProducts";
import VendorOrders from "./pages/VendorOrders";
import VendorSalesReport from "./pages/VendorSalesReport";

// Product Management
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        {/* ================= CUSTOMER ================= */}
        <Route path="/" element={<CustomerHome />} />
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/register" element={<CustomerRegister />} />
        <Route path="/profile" element={<CustomerProfile />} />
        <Route path="/products" element={<CustomerViewProducts />} />

        {/* ================= PRODUCT ================= */}
        <Route path="/product/:id" element={<ProductDetail />} />

        {/* ================= ORDERS ================= */}
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/track" element={<TrackOrders />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/success" element={<OrderSuccess />} />

        {/* ================= VENDOR ================= */}
        <Route path="/vendor" element={<VendorHome />} />
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/register" element={<VendorRegister />} />
        <Route path="/vendor/products" element={<VendorProducts />} />
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