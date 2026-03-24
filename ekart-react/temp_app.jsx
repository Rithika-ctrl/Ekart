import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/App.jsx");import { BrowserRouter as Router, Routes, Route } from "/node_modules/.vite/deps/react-router-dom.js?v=694bacdc";
import Navbar from "/src/components/Navbar.jsx";
// Customer Pages
import CustomerHome from "/src/pages/CustomerHome.jsx";
import CustomerLogin from "/src/pages/CustomerLogin.jsx";
import CustomerRegister from "/src/pages/CustomerRegister.jsx";
import CustomerProfile from "/src/pages/CustomerProfile.jsx";
import CustomerViewProducts from "/src/pages/CustomerViewProducts.jsx";
// Product & Orders
import ProductDetail from "/src/pages/ProductDetail.jsx";
import OrderHistory from "/src/pages/OrderHistory.jsx";
import TrackOrders from "/src/pages/TrackOrders.jsx";
import OrderSuccess from "/src/pages/OrderSuccess.jsx";
import Payment from "/src/pages/Payment.jsx";
// Vendor Pages
import VendorHome from "/src/pages/VendorHome.jsx";
import VendorLogin from "/src/pages/VendorLogin.jsx";
import VendorRegister from "/src/pages/VendorRegister.jsx";
import VendorProducts from "/src/pages/VendorProducts.jsx";
import VendorOrders from "/src/pages/VendorOrders.jsx";
import VendorSalesReport from "/src/pages/VendorSalesReport.jsx";
// Additional pages (routes added)
import ViewCart from "/src/pages/ViewCart.jsx";
import Wishlist from "/src/pages/Wishlist.jsx";
import ViewOrders from "/src/pages/ViewOrders.jsx";
import CustomerOtp from "/src/pages/CustomerOtp.jsx";
import ForgotPassword from "/src/pages/ForgotPassword.jsx";
import ResetPassword from "/src/pages/ResetPassword.jsx";
import CustomerForgotPassword from "/src/pages/CustomerForgotPassword.jsx";
import CustomerResetPassword from "/src/pages/CustomerResetPassword.jsx";
import VendorForgotPassword from "/src/pages/VendorForgotPassword.jsx";
import VendorResetPassword from "/src/pages/VendorResetPassword.jsx";
import VendorOtp from "/src/pages/VendorOtp.jsx";
import VendorStoreFront from "/src/pages/VendorStoreFront.jsx";
import VendorViewProducts from "/src/pages/VendorViewProducts.jsx";
import CustomerCoupons from "/src/pages/CustomerCoupons.jsx";
import CustomerRefundReport from "/src/pages/CustomerRefundReport.jsx";
import CustomerSecuritySettings from "/src/pages/CustomerSecuritySettings.jsx";
import AiAssistantWidget from "/src/pages/AiAssistantWidget.jsx";
import ChatWidget from "/src/pages/ChatWidget.jsx";
// Product Management
import AddProduct from "/src/pages/AddProduct.jsx";
import EditProduct from "/src/pages/EditProduct.jsx";
var _jsxFileName = "C:/Users/whynew.in/OneDrive/Desktop/EKART/ekart-react/src/App.jsx";
import __vite__cjsImport38_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=694bacdc"; const _jsxDEV = __vite__cjsImport38_react_jsxDevRuntime["jsxDEV"];
function App() {
	return /* @__PURE__ */ _jsxDEV(Router, { children: [/* @__PURE__ */ _jsxDEV(Navbar, {}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 54,
		columnNumber: 7
	}, this), /* @__PURE__ */ _jsxDEV(Routes, { children: [
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/",
			element: /* @__PURE__ */ _jsxDEV(CustomerHome, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 58,
				columnNumber: 34
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 58,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/login",
			element: /* @__PURE__ */ _jsxDEV(CustomerLogin, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 59,
				columnNumber: 39
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 59,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/register",
			element: /* @__PURE__ */ _jsxDEV(CustomerRegister, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 60,
				columnNumber: 42
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 60,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/profile",
			element: /* @__PURE__ */ _jsxDEV(CustomerProfile, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 61,
				columnNumber: 41
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 61,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/products",
			element: /* @__PURE__ */ _jsxDEV(CustomerViewProducts, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 62,
				columnNumber: 42
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 62,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/product/:id",
			element: /* @__PURE__ */ _jsxDEV(ProductDetail, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 65,
				columnNumber: 45
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 65,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/cart",
			element: /* @__PURE__ */ _jsxDEV(ViewCart, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 68,
				columnNumber: 38
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 68,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/wishlist",
			element: /* @__PURE__ */ _jsxDEV(Wishlist, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 69,
				columnNumber: 42
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 69,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/view-orders",
			element: /* @__PURE__ */ _jsxDEV(ViewOrders, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 70,
				columnNumber: 45
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 70,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/otp",
			element: /* @__PURE__ */ _jsxDEV(CustomerOtp, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 71,
				columnNumber: 37
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 71,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/forgot-password",
			element: /* @__PURE__ */ _jsxDEV(ForgotPassword, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 72,
				columnNumber: 49
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 72,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/reset-password",
			element: /* @__PURE__ */ _jsxDEV(ResetPassword, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 73,
				columnNumber: 48
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 73,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/customer/forgot-password",
			element: /* @__PURE__ */ _jsxDEV(CustomerForgotPassword, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 74,
				columnNumber: 58
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 74,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/customer/reset-password",
			element: /* @__PURE__ */ _jsxDEV(CustomerResetPassword, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 75,
				columnNumber: 57
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 75,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/forgot-password",
			element: /* @__PURE__ */ _jsxDEV(VendorForgotPassword, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 76,
				columnNumber: 56
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 76,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/reset-password",
			element: /* @__PURE__ */ _jsxDEV(VendorResetPassword, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 77,
				columnNumber: 55
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 77,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/otp",
			element: /* @__PURE__ */ _jsxDEV(VendorOtp, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 78,
				columnNumber: 44
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 78,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/storefront",
			element: /* @__PURE__ */ _jsxDEV(VendorStoreFront, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 79,
				columnNumber: 51
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 79,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/view-products",
			element: /* @__PURE__ */ _jsxDEV(VendorViewProducts, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 80,
				columnNumber: 54
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 80,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/coupons",
			element: /* @__PURE__ */ _jsxDEV(CustomerCoupons, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 81,
				columnNumber: 41
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 81,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/refunds",
			element: /* @__PURE__ */ _jsxDEV(CustomerRefundReport, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 82,
				columnNumber: 41
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 82,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/security-settings",
			element: /* @__PURE__ */ _jsxDEV(CustomerSecuritySettings, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 83,
				columnNumber: 51
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 83,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/ai-assistant",
			element: /* @__PURE__ */ _jsxDEV(AiAssistantWidget, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 84,
				columnNumber: 46
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 84,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/chat",
			element: /* @__PURE__ */ _jsxDEV(ChatWidget, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 85,
				columnNumber: 38
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 85,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/orders",
			element: /* @__PURE__ */ _jsxDEV(OrderHistory, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 88,
				columnNumber: 40
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 88,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/track",
			element: /* @__PURE__ */ _jsxDEV(TrackOrders, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 89,
				columnNumber: 39
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 89,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/payment",
			element: /* @__PURE__ */ _jsxDEV(Payment, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 90,
				columnNumber: 41
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 90,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/success",
			element: /* @__PURE__ */ _jsxDEV(OrderSuccess, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 91,
				columnNumber: 41
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 91,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor",
			element: /* @__PURE__ */ _jsxDEV(VendorHome, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 94,
				columnNumber: 40
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 94,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/login",
			element: /* @__PURE__ */ _jsxDEV(VendorLogin, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 95,
				columnNumber: 46
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 95,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/register",
			element: /* @__PURE__ */ _jsxDEV(VendorRegister, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 96,
				columnNumber: 49
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 96,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/products",
			element: /* @__PURE__ */ _jsxDEV(VendorProducts, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 97,
				columnNumber: 49
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 97,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/orders",
			element: /* @__PURE__ */ _jsxDEV(VendorOrders, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 98,
				columnNumber: 47
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 98,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/report",
			element: /* @__PURE__ */ _jsxDEV(VendorSalesReport, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 99,
				columnNumber: 47
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 99,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/add-product",
			element: /* @__PURE__ */ _jsxDEV(AddProduct, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 102,
				columnNumber: 52
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 102,
			columnNumber: 9
		}, this),
		/* @__PURE__ */ _jsxDEV(Route, {
			path: "/vendor/edit-product/:id",
			element: /* @__PURE__ */ _jsxDEV(EditProduct, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 103,
				columnNumber: 57
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 103,
			columnNumber: 9
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 56,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 53,
		columnNumber: 5
	}, this);
}
_c = App;
export default App;
var _c;
$RefreshReg$(_c, "App");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
import * as __vite_react_currentExports from "/src/App.jsx";
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }

  const currentExports = __vite_react_currentExports;
  queueMicrotask(() => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/whynew.in/OneDrive/Desktop/EKART/ekart-react/src/App.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/whynew.in/OneDrive/Desktop/EKART/ekart-react/src/App.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) { return RefreshRuntime.register(type, "C:/Users/whynew.in/OneDrive/Desktop/EKART/ekart-react/src/App.jsx" + ' ' + id); }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6IkFBQUEsU0FBUyxpQkFBaUIsUUFBUSxRQUFRLGFBQWE7QUFFdkQsT0FBTyxZQUFZOztBQUduQixPQUFPLGtCQUFrQjtBQUN6QixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLHNCQUFzQjtBQUM3QixPQUFPLHFCQUFxQjtBQUM1QixPQUFPLDBCQUEwQjs7QUFHakMsT0FBTyxtQkFBbUI7QUFDMUIsT0FBTyxrQkFBa0I7QUFDekIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxrQkFBa0I7QUFDekIsT0FBTyxhQUFhOztBQUdwQixPQUFPLGdCQUFnQjtBQUN2QixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLG9CQUFvQjtBQUMzQixPQUFPLG9CQUFvQjtBQUMzQixPQUFPLGtCQUFrQjtBQUN6QixPQUFPLHVCQUF1Qjs7QUFHOUIsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sY0FBYztBQUNyQixPQUFPLGdCQUFnQjtBQUN2QixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLG9CQUFvQjtBQUMzQixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLDRCQUE0QjtBQUNuQyxPQUFPLDJCQUEyQjtBQUNsQyxPQUFPLDBCQUEwQjtBQUNqQyxPQUFPLHlCQUF5QjtBQUNoQyxPQUFPLGVBQWU7QUFDdEIsT0FBTyxzQkFBc0I7QUFDN0IsT0FBTyx3QkFBd0I7QUFDL0IsT0FBTyxxQkFBcUI7QUFDNUIsT0FBTywwQkFBMEI7QUFDakMsT0FBTyw4QkFBOEI7QUFDckMsT0FBTyx1QkFBdUI7QUFDOUIsT0FBTyxnQkFBZ0I7O0FBR3ZCLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8saUJBQWlCOzs7QUFFeEIsU0FBUyxNQUFNO0FBQ2IsUUFDRSx3QkFBQyxRQUFELGFBQ0Usd0JBQUMsUUFBRCxFQUFVOzs7O1dBRVYsd0JBQUMsUUFBRDtFQUVFLHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQUksU0FBUyx3QkFBQyxjQUFELEVBQWdCOzs7OztHQUFJOzs7OztFQUM3Qyx3QkFBQyxPQUFEO0dBQU8sTUFBSztHQUFTLFNBQVMsd0JBQUMsZUFBRCxFQUFpQjs7Ozs7R0FBSTs7Ozs7RUFDbkQsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBWSxTQUFTLHdCQUFDLGtCQUFELEVBQW9COzs7OztHQUFJOzs7OztFQUN6RCx3QkFBQyxPQUFEO0dBQU8sTUFBSztHQUFXLFNBQVMsd0JBQUMsaUJBQUQsRUFBbUI7Ozs7O0dBQUk7Ozs7O0VBQ3ZELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQVksU0FBUyx3QkFBQyxzQkFBRCxFQUF3Qjs7Ozs7R0FBSTs7Ozs7RUFHN0Qsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBZSxTQUFTLHdCQUFDLGVBQUQsRUFBaUI7Ozs7O0dBQUk7Ozs7O0VBR3pELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQVEsU0FBUyx3QkFBQyxVQUFELEVBQVk7Ozs7O0dBQUk7Ozs7O0VBQzdDLHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQVksU0FBUyx3QkFBQyxVQUFELEVBQVk7Ozs7O0dBQUk7Ozs7O0VBQ2pELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQWUsU0FBUyx3QkFBQyxZQUFELEVBQWM7Ozs7O0dBQUk7Ozs7O0VBQ3RELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQU8sU0FBUyx3QkFBQyxhQUFELEVBQWU7Ozs7O0dBQUk7Ozs7O0VBQy9DLHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQW1CLFNBQVMsd0JBQUMsZ0JBQUQsRUFBa0I7Ozs7O0dBQUk7Ozs7O0VBQzlELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQWtCLFNBQVMsd0JBQUMsZUFBRCxFQUFpQjs7Ozs7R0FBSTs7Ozs7RUFDNUQsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBNEIsU0FBUyx3QkFBQyx3QkFBRCxFQUEwQjs7Ozs7R0FBSTs7Ozs7RUFDL0Usd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBMkIsU0FBUyx3QkFBQyx1QkFBRCxFQUF5Qjs7Ozs7R0FBSTs7Ozs7RUFDN0Usd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBMEIsU0FBUyx3QkFBQyxzQkFBRCxFQUF3Qjs7Ozs7R0FBSTs7Ozs7RUFDM0Usd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBeUIsU0FBUyx3QkFBQyxxQkFBRCxFQUF1Qjs7Ozs7R0FBSTs7Ozs7RUFDekUsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBYyxTQUFTLHdCQUFDLFdBQUQsRUFBYTs7Ozs7R0FBSTs7Ozs7RUFDcEQsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBcUIsU0FBUyx3QkFBQyxrQkFBRCxFQUFvQjs7Ozs7R0FBSTs7Ozs7RUFDbEUsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBd0IsU0FBUyx3QkFBQyxvQkFBRCxFQUFzQjs7Ozs7R0FBSTs7Ozs7RUFDdkUsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBVyxTQUFTLHdCQUFDLGlCQUFELEVBQW1COzs7OztHQUFJOzs7OztFQUN2RCx3QkFBQyxPQUFEO0dBQU8sTUFBSztHQUFXLFNBQVMsd0JBQUMsc0JBQUQsRUFBd0I7Ozs7O0dBQUk7Ozs7O0VBQzVELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQXFCLFNBQVMsd0JBQUMsMEJBQUQsRUFBNEI7Ozs7O0dBQUk7Ozs7O0VBQzFFLHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQWdCLFNBQVMsd0JBQUMsbUJBQUQsRUFBcUI7Ozs7O0dBQUk7Ozs7O0VBQzlELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQVEsU0FBUyx3QkFBQyxZQUFELEVBQWM7Ozs7O0dBQUk7Ozs7O0VBRy9DLHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQVUsU0FBUyx3QkFBQyxjQUFELEVBQWdCOzs7OztHQUFJOzs7OztFQUNuRCx3QkFBQyxPQUFEO0dBQU8sTUFBSztHQUFTLFNBQVMsd0JBQUMsYUFBRCxFQUFlOzs7OztHQUFJOzs7OztFQUNqRCx3QkFBQyxPQUFEO0dBQU8sTUFBSztHQUFXLFNBQVMsd0JBQUMsU0FBRCxFQUFXOzs7OztHQUFJOzs7OztFQUMvQyx3QkFBQyxPQUFEO0dBQU8sTUFBSztHQUFXLFNBQVMsd0JBQUMsY0FBRCxFQUFnQjs7Ozs7R0FBSTs7Ozs7RUFHcEQsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBVSxTQUFTLHdCQUFDLFlBQUQsRUFBYzs7Ozs7R0FBSTs7Ozs7RUFDakQsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBZ0IsU0FBUyx3QkFBQyxhQUFELEVBQWU7Ozs7O0dBQUk7Ozs7O0VBQ3hELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQW1CLFNBQVMsd0JBQUMsZ0JBQUQsRUFBa0I7Ozs7O0dBQUk7Ozs7O0VBQzlELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQW1CLFNBQVMsd0JBQUMsZ0JBQUQsRUFBa0I7Ozs7O0dBQUk7Ozs7O0VBQzlELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQWlCLFNBQVMsd0JBQUMsY0FBRCxFQUFnQjs7Ozs7R0FBSTs7Ozs7RUFDMUQsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBaUIsU0FBUyx3QkFBQyxtQkFBRCxFQUFxQjs7Ozs7R0FBSTs7Ozs7RUFHL0Qsd0JBQUMsT0FBRDtHQUFPLE1BQUs7R0FBc0IsU0FBUyx3QkFBQyxZQUFELEVBQWM7Ozs7O0dBQUk7Ozs7O0VBQzdELHdCQUFDLE9BQUQ7R0FBTyxNQUFLO0dBQTJCLFNBQVMsd0JBQUMsYUFBRCxFQUFlOzs7OztHQUFJOzs7OztFQUM1RDs7OztVQUNGOzs7Ozs7O0FBSWIsZUFBZSIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJBcHAuanN4Il0sInZlcnNpb24iOjMsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJyb3dzZXJSb3V0ZXIgYXMgUm91dGVyLCBSb3V0ZXMsIFJvdXRlIH0gZnJvbSBcInJlYWN0LXJvdXRlci1kb21cIjtcclxuXHJcbmltcG9ydCBOYXZiYXIgZnJvbSBcIi4vY29tcG9uZW50cy9OYXZiYXJcIjtcclxuXHJcbi8vIEN1c3RvbWVyIFBhZ2VzXHJcbmltcG9ydCBDdXN0b21lckhvbWUgZnJvbSBcIi4vcGFnZXMvQ3VzdG9tZXJIb21lXCI7XHJcbmltcG9ydCBDdXN0b21lckxvZ2luIGZyb20gXCIuL3BhZ2VzL0N1c3RvbWVyTG9naW5cIjtcclxuaW1wb3J0IEN1c3RvbWVyUmVnaXN0ZXIgZnJvbSBcIi4vcGFnZXMvQ3VzdG9tZXJSZWdpc3RlclwiO1xyXG5pbXBvcnQgQ3VzdG9tZXJQcm9maWxlIGZyb20gXCIuL3BhZ2VzL0N1c3RvbWVyUHJvZmlsZVwiO1xyXG5pbXBvcnQgQ3VzdG9tZXJWaWV3UHJvZHVjdHMgZnJvbSBcIi4vcGFnZXMvQ3VzdG9tZXJWaWV3UHJvZHVjdHNcIjtcclxuXHJcbi8vIFByb2R1Y3QgJiBPcmRlcnNcclxuaW1wb3J0IFByb2R1Y3REZXRhaWwgZnJvbSBcIi4vcGFnZXMvUHJvZHVjdERldGFpbFwiO1xyXG5pbXBvcnQgT3JkZXJIaXN0b3J5IGZyb20gXCIuL3BhZ2VzL09yZGVySGlzdG9yeVwiO1xyXG5pbXBvcnQgVHJhY2tPcmRlcnMgZnJvbSBcIi4vcGFnZXMvVHJhY2tPcmRlcnNcIjtcclxuaW1wb3J0IE9yZGVyU3VjY2VzcyBmcm9tIFwiLi9wYWdlcy9PcmRlclN1Y2Nlc3NcIjtcclxuaW1wb3J0IFBheW1lbnQgZnJvbSBcIi4vcGFnZXMvUGF5bWVudFwiO1xyXG5cclxuLy8gVmVuZG9yIFBhZ2VzXHJcbmltcG9ydCBWZW5kb3JIb21lIGZyb20gXCIuL3BhZ2VzL1ZlbmRvckhvbWVcIjtcclxuaW1wb3J0IFZlbmRvckxvZ2luIGZyb20gXCIuL3BhZ2VzL1ZlbmRvckxvZ2luXCI7XHJcbmltcG9ydCBWZW5kb3JSZWdpc3RlciBmcm9tIFwiLi9wYWdlcy9WZW5kb3JSZWdpc3RlclwiO1xyXG5pbXBvcnQgVmVuZG9yUHJvZHVjdHMgZnJvbSBcIi4vcGFnZXMvVmVuZG9yUHJvZHVjdHNcIjtcclxuaW1wb3J0IFZlbmRvck9yZGVycyBmcm9tIFwiLi9wYWdlcy9WZW5kb3JPcmRlcnNcIjtcclxuaW1wb3J0IFZlbmRvclNhbGVzUmVwb3J0IGZyb20gXCIuL3BhZ2VzL1ZlbmRvclNhbGVzUmVwb3J0XCI7XHJcblxyXG4vLyBBZGRpdGlvbmFsIHBhZ2VzIChyb3V0ZXMgYWRkZWQpXHJcbmltcG9ydCBWaWV3Q2FydCBmcm9tIFwiLi9wYWdlcy9WaWV3Q2FydFwiO1xyXG5pbXBvcnQgV2lzaGxpc3QgZnJvbSBcIi4vcGFnZXMvV2lzaGxpc3RcIjtcclxuaW1wb3J0IFZpZXdPcmRlcnMgZnJvbSBcIi4vcGFnZXMvVmlld09yZGVyc1wiO1xyXG5pbXBvcnQgQ3VzdG9tZXJPdHAgZnJvbSBcIi4vcGFnZXMvQ3VzdG9tZXJPdHBcIjtcclxuaW1wb3J0IEZvcmdvdFBhc3N3b3JkIGZyb20gXCIuL3BhZ2VzL0ZvcmdvdFBhc3N3b3JkXCI7XHJcbmltcG9ydCBSZXNldFBhc3N3b3JkIGZyb20gXCIuL3BhZ2VzL1Jlc2V0UGFzc3dvcmRcIjtcclxuaW1wb3J0IEN1c3RvbWVyRm9yZ290UGFzc3dvcmQgZnJvbSBcIi4vcGFnZXMvQ3VzdG9tZXJGb3Jnb3RQYXNzd29yZFwiO1xyXG5pbXBvcnQgQ3VzdG9tZXJSZXNldFBhc3N3b3JkIGZyb20gXCIuL3BhZ2VzL0N1c3RvbWVyUmVzZXRQYXNzd29yZFwiO1xyXG5pbXBvcnQgVmVuZG9yRm9yZ290UGFzc3dvcmQgZnJvbSBcIi4vcGFnZXMvVmVuZG9yRm9yZ290UGFzc3dvcmRcIjtcclxuaW1wb3J0IFZlbmRvclJlc2V0UGFzc3dvcmQgZnJvbSBcIi4vcGFnZXMvVmVuZG9yUmVzZXRQYXNzd29yZFwiO1xyXG5pbXBvcnQgVmVuZG9yT3RwIGZyb20gXCIuL3BhZ2VzL1ZlbmRvck90cFwiO1xyXG5pbXBvcnQgVmVuZG9yU3RvcmVGcm9udCBmcm9tIFwiLi9wYWdlcy9WZW5kb3JTdG9yZUZyb250XCI7XHJcbmltcG9ydCBWZW5kb3JWaWV3UHJvZHVjdHMgZnJvbSBcIi4vcGFnZXMvVmVuZG9yVmlld1Byb2R1Y3RzXCI7XHJcbmltcG9ydCBDdXN0b21lckNvdXBvbnMgZnJvbSBcIi4vcGFnZXMvQ3VzdG9tZXJDb3Vwb25zXCI7XHJcbmltcG9ydCBDdXN0b21lclJlZnVuZFJlcG9ydCBmcm9tIFwiLi9wYWdlcy9DdXN0b21lclJlZnVuZFJlcG9ydFwiO1xyXG5pbXBvcnQgQ3VzdG9tZXJTZWN1cml0eVNldHRpbmdzIGZyb20gXCIuL3BhZ2VzL0N1c3RvbWVyU2VjdXJpdHlTZXR0aW5nc1wiO1xyXG5pbXBvcnQgQWlBc3Npc3RhbnRXaWRnZXQgZnJvbSBcIi4vcGFnZXMvQWlBc3Npc3RhbnRXaWRnZXRcIjtcclxuaW1wb3J0IENoYXRXaWRnZXQgZnJvbSBcIi4vcGFnZXMvQ2hhdFdpZGdldFwiO1xyXG5cclxuLy8gUHJvZHVjdCBNYW5hZ2VtZW50XHJcbmltcG9ydCBBZGRQcm9kdWN0IGZyb20gXCIuL3BhZ2VzL0FkZFByb2R1Y3RcIjtcclxuaW1wb3J0IEVkaXRQcm9kdWN0IGZyb20gXCIuL3BhZ2VzL0VkaXRQcm9kdWN0XCI7XHJcblxyXG5mdW5jdGlvbiBBcHAoKSB7XHJcbiAgcmV0dXJuIChcclxuICAgIDxSb3V0ZXI+XHJcbiAgICAgIDxOYXZiYXIgLz5cclxuXHJcbiAgICAgIDxSb3V0ZXM+XHJcbiAgICAgICAgey8qID09PT09PT09PT09PT09PT09IENVU1RPTUVSID09PT09PT09PT09PT09PT09ICovfVxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL1wiIGVsZW1lbnQ9ezxDdXN0b21lckhvbWUgLz59IC8+XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvbG9naW5cIiBlbGVtZW50PXs8Q3VzdG9tZXJMb2dpbiAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi9yZWdpc3RlclwiIGVsZW1lbnQ9ezxDdXN0b21lclJlZ2lzdGVyIC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3Byb2ZpbGVcIiBlbGVtZW50PXs8Q3VzdG9tZXJQcm9maWxlIC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3Byb2R1Y3RzXCIgZWxlbWVudD17PEN1c3RvbWVyVmlld1Byb2R1Y3RzIC8+fSAvPlxyXG5cclxuICAgICAgICB7LyogPT09PT09PT09PT09PT09PT0gUFJPRFVDVCA9PT09PT09PT09PT09PT09PSAqL31cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi9wcm9kdWN0LzppZFwiIGVsZW1lbnQ9ezxQcm9kdWN0RGV0YWlsIC8+fSAvPlxyXG5cclxuICAgICAgICB7LyogQWRkaXRpb25hbCByb3V0ZXMgKi99XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvY2FydFwiIGVsZW1lbnQ9ezxWaWV3Q2FydCAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi93aXNobGlzdFwiIGVsZW1lbnQ9ezxXaXNobGlzdCAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi92aWV3LW9yZGVyc1wiIGVsZW1lbnQ9ezxWaWV3T3JkZXJzIC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL290cFwiIGVsZW1lbnQ9ezxDdXN0b21lck90cCAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi9mb3Jnb3QtcGFzc3dvcmRcIiBlbGVtZW50PXs8Rm9yZ290UGFzc3dvcmQgLz59IC8+XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvcmVzZXQtcGFzc3dvcmRcIiBlbGVtZW50PXs8UmVzZXRQYXNzd29yZCAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi9jdXN0b21lci9mb3Jnb3QtcGFzc3dvcmRcIiBlbGVtZW50PXs8Q3VzdG9tZXJGb3Jnb3RQYXNzd29yZCAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi9jdXN0b21lci9yZXNldC1wYXNzd29yZFwiIGVsZW1lbnQ9ezxDdXN0b21lclJlc2V0UGFzc3dvcmQgLz59IC8+XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvdmVuZG9yL2ZvcmdvdC1wYXNzd29yZFwiIGVsZW1lbnQ9ezxWZW5kb3JGb3Jnb3RQYXNzd29yZCAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi92ZW5kb3IvcmVzZXQtcGFzc3dvcmRcIiBlbGVtZW50PXs8VmVuZG9yUmVzZXRQYXNzd29yZCAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi92ZW5kb3Ivb3RwXCIgZWxlbWVudD17PFZlbmRvck90cCAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi92ZW5kb3Ivc3RvcmVmcm9udFwiIGVsZW1lbnQ9ezxWZW5kb3JTdG9yZUZyb250IC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3ZlbmRvci92aWV3LXByb2R1Y3RzXCIgZWxlbWVudD17PFZlbmRvclZpZXdQcm9kdWN0cyAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi9jb3Vwb25zXCIgZWxlbWVudD17PEN1c3RvbWVyQ291cG9ucyAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi9yZWZ1bmRzXCIgZWxlbWVudD17PEN1c3RvbWVyUmVmdW5kUmVwb3J0IC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3NlY3VyaXR5LXNldHRpbmdzXCIgZWxlbWVudD17PEN1c3RvbWVyU2VjdXJpdHlTZXR0aW5ncyAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi9haS1hc3Npc3RhbnRcIiBlbGVtZW50PXs8QWlBc3Npc3RhbnRXaWRnZXQgLz59IC8+XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvY2hhdFwiIGVsZW1lbnQ9ezxDaGF0V2lkZ2V0IC8+fSAvPlxyXG5cclxuICAgICAgICB7LyogPT09PT09PT09PT09PT09PT0gT1JERVJTID09PT09PT09PT09PT09PT09ICovfVxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL29yZGVyc1wiIGVsZW1lbnQ9ezxPcmRlckhpc3RvcnkgLz59IC8+XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvdHJhY2tcIiBlbGVtZW50PXs8VHJhY2tPcmRlcnMgLz59IC8+XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvcGF5bWVudFwiIGVsZW1lbnQ9ezxQYXltZW50IC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3N1Y2Nlc3NcIiBlbGVtZW50PXs8T3JkZXJTdWNjZXNzIC8+fSAvPlxyXG5cclxuICAgICAgICB7LyogPT09PT09PT09PT09PT09PT0gVkVORE9SID09PT09PT09PT09PT09PT09ICovfVxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3ZlbmRvclwiIGVsZW1lbnQ9ezxWZW5kb3JIb21lIC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3ZlbmRvci9sb2dpblwiIGVsZW1lbnQ9ezxWZW5kb3JMb2dpbiAvPn0gLz5cclxuICAgICAgICA8Um91dGUgcGF0aD1cIi92ZW5kb3IvcmVnaXN0ZXJcIiBlbGVtZW50PXs8VmVuZG9yUmVnaXN0ZXIgLz59IC8+XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvdmVuZG9yL3Byb2R1Y3RzXCIgZWxlbWVudD17PFZlbmRvclByb2R1Y3RzIC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3ZlbmRvci9vcmRlcnNcIiBlbGVtZW50PXs8VmVuZG9yT3JkZXJzIC8+fSAvPlxyXG4gICAgICAgIDxSb3V0ZSBwYXRoPVwiL3ZlbmRvci9yZXBvcnRcIiBlbGVtZW50PXs8VmVuZG9yU2FsZXNSZXBvcnQgLz59IC8+XHJcblxyXG4gICAgICAgIHsvKiA9PT09PT09PT09PT09PT09PSBQUk9EVUNUIE1HTVQgPT09PT09PT09PT09PT09PT0gKi99XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvdmVuZG9yL2FkZC1wcm9kdWN0XCIgZWxlbWVudD17PEFkZFByb2R1Y3QgLz59IC8+XHJcbiAgICAgICAgPFJvdXRlIHBhdGg9XCIvdmVuZG9yL2VkaXQtcHJvZHVjdC86aWRcIiBlbGVtZW50PXs8RWRpdFByb2R1Y3QgLz59IC8+XHJcbiAgICAgIDwvUm91dGVzPlxyXG4gICAgPC9Sb3V0ZXI+XHJcbiAgKTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgQXBwOyJdfQ==
