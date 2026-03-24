import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/Navbar.jsx");import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=694bacdc"; const useState = __vite__cjsImport0_react["useState"];
import { Link } from "/node_modules/.vite/deps/react-router-dom.js?v=694bacdc";
import { isLoggedIn, clearToken } from "/src/utils/api.js";
var _jsxFileName = "C:/Users/whynew.in/OneDrive/Desktop/EKART/ekart-react/src/components/Navbar.jsx";
import __vite__cjsImport3_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=694bacdc"; const _jsxDEV = __vite__cjsImport3_react_jsxDevRuntime["jsxDEV"]; const _Fragment = __vite__cjsImport3_react_jsxDevRuntime["Fragment"];
var _s = $RefreshSig$();
export default function Navbar() {
	_s();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const loggedIn = isLoggedIn();
	const handleLogout = () => {
		clearToken();
		window.location.href = "/login";
	};
	return /* @__PURE__ */ _jsxDEV("nav", {
		className: "ekart-nav",
		children: [/* @__PURE__ */ _jsxDEV(Link, {
			to: "/",
			className: "nav-brand",
			children: [
				/* @__PURE__ */ _jsxDEV("i", {
					className: "fas fa-shopping-cart",
					style: { fontSize: "1.1rem" }
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 17,
					columnNumber: 9
				}, this),
				"Ek",
				/* @__PURE__ */ _jsxDEV("span", { children: "art" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 18,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 16,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("ul", {
			className: "nav-links",
			children: [
				/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV(Link, {
					to: "/products",
					children: "Shop"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 22,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 22,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("li", {
					className: "dropdown",
					onMouseEnter: () => setDropdownOpen(true),
					onMouseLeave: () => setDropdownOpen(false),
					children: [/* @__PURE__ */ _jsxDEV("a", {
						href: "#",
						onClick: (e) => e.preventDefault(),
						children: [
							/* @__PURE__ */ _jsxDEV("i", { className: "fas fa-user-circle" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 30,
								columnNumber: 13
							}, this),
							" Account",
							" ",
							/* @__PURE__ */ _jsxDEV("i", {
								className: "fas fa-angle-down",
								style: { fontSize: ".65rem" }
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 31,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 29,
						columnNumber: 11
					}, this), dropdownOpen && /* @__PURE__ */ _jsxDEV("ul", {
						className: "dropdown-menu visible",
						children: loggedIn ? /* @__PURE__ */ _jsxDEV(_Fragment, { children: [
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV(Link, {
								to: "/profile",
								children: [/* @__PURE__ */ _jsxDEV("i", {
									className: "fas fa-user",
									style: {
										color: "var(--yellow)",
										width: 14
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 37,
									columnNumber: 43
								}, this), " My Profile"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 37,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 37,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV(Link, {
								to: "/orders",
								children: [/* @__PURE__ */ _jsxDEV("i", {
									className: "fas fa-box",
									style: {
										color: "var(--yellow)",
										width: 14
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 38,
									columnNumber: 42
								}, this), " My Orders"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 38,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 38,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV("hr", { className: "divider" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 39,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 39,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV("button", {
								className: "dropdown-btn",
								onClick: handleLogout,
								children: [/* @__PURE__ */ _jsxDEV("i", {
									className: "fas fa-sign-out-alt",
									style: { width: 14 }
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 40,
									columnNumber: 79
								}, this), " Logout"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 40,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 40,
								columnNumber: 19
							}, this)
						] }, void 0, true) : /* @__PURE__ */ _jsxDEV(_Fragment, { children: [
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV(Link, {
								to: "/login",
								children: [/* @__PURE__ */ _jsxDEV("i", {
									className: "fas fa-sign-in-alt",
									style: {
										color: "var(--yellow)",
										width: 14
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 44,
									columnNumber: 41
								}, this), " Customer Login"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 44,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 44,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV(Link, {
								to: "/register",
								children: [/* @__PURE__ */ _jsxDEV("i", {
									className: "fas fa-user-plus",
									style: {
										color: "#7dc97d",
										width: 14
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 45,
									columnNumber: 44
								}, this), " Customer Register"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 45,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 45,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV("hr", { className: "divider" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 46,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 46,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV("a", {
								href: "/vendor/login",
								children: [/* @__PURE__ */ _jsxDEV("i", {
									className: "fas fa-store",
									style: {
										color: "var(--yellow)",
										width: 14
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 47,
									columnNumber: 47
								}, this), " Vendor Login"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 47,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 47,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV("a", {
								href: "/vendor/register",
								children: [/* @__PURE__ */ _jsxDEV("i", {
									className: "fas fa-store",
									style: {
										color: "#7dc97d",
										width: 14
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 48,
									columnNumber: 50
								}, this), " Vendor Register"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 48,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 48,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV("hr", { className: "divider" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 49,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 49,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV("a", {
								href: "/admin/login",
								children: [/* @__PURE__ */ _jsxDEV("i", {
									className: "fas fa-shield-alt",
									style: {
										color: "rgba(255,255,255,0.4)",
										width: 14
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 50,
									columnNumber: 46
								}, this), " Admin Login"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 50,
								columnNumber: 23
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 50,
								columnNumber: 19
							}, this)
						] }, void 0, true)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 34,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 24,
					columnNumber: 9
				}, this),
				!loggedIn && /* @__PURE__ */ _jsxDEV("li", { children: /* @__PURE__ */ _jsxDEV(Link, {
					to: "/register",
					style: {
						background: "var(--yellow)",
						color: "#1a1000",
						fontWeight: 700,
						borderRadius: "50px",
						padding: ".45rem 1.2rem"
					},
					children: "Register"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 59,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 58,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 21,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 15,
		columnNumber: 5
	}, this);
}
_s(Navbar, "z5Nkh6K+y+CV4vT0AOyJ2ID9tJg=");
_c = Navbar;
var _c;
$RefreshReg$(_c, "Navbar");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
import * as __vite_react_currentExports from "/src/components/Navbar.jsx";
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }

  const currentExports = __vite_react_currentExports;
  queueMicrotask(() => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/whynew.in/OneDrive/Desktop/EKART/ekart-react/src/components/Navbar.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/whynew.in/OneDrive/Desktop/EKART/ekart-react/src/components/Navbar.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) { return RefreshRuntime.register(type, "C:/Users/whynew.in/OneDrive/Desktop/EKART/ekart-react/src/components/Navbar.jsx" + ' ' + id); }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6IkFBQUEsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyxZQUFZO0FBQ3JCLFNBQVMsWUFBWSxrQkFBa0I7Ozs7QUFFdkMsZUFBZSxTQUFTLFNBQVM7O0NBQy9CLE1BQU0sQ0FBQyxjQUFjLG1CQUFtQixTQUFTLE1BQU07Q0FDdkQsTUFBTSxXQUFXLFlBQVk7Q0FFN0IsTUFBTSxxQkFBcUI7QUFDekIsY0FBWTtBQUNaLFNBQU8sU0FBUyxPQUFPOztBQUd6QixRQUNFLHdCQUFDLE9BQUQ7RUFBSyxXQUFVO1lBQWYsQ0FDRSx3QkFBQyxNQUFEO0dBQU0sSUFBRztHQUFJLFdBQVU7YUFBdkI7SUFDRSx3QkFBQyxLQUFEO0tBQUcsV0FBVTtLQUF1QixPQUFPLEVBQUUsVUFBVSxVQUFVO0tBQU07Ozs7OztJQUNyRSx3QkFBQyxRQUFELFlBQU0sT0FBVTs7Ozs7SUFDYjs7Ozs7WUFFUCx3QkFBQyxNQUFEO0dBQUksV0FBVTthQUFkO0lBQ0Usd0JBQUMsTUFBRCxZQUFJLHdCQUFDLE1BQUQ7S0FBTSxJQUFHO2VBQVk7S0FBVzs7OztjQUFLOzs7OztJQUV6Qyx3QkFBQyxNQUFEO0tBQ0UsV0FBVTtLQUNWLG9CQUFvQixnQkFBZ0IsS0FBSztLQUN6QyxvQkFBb0IsZ0JBQWdCLE1BQU07ZUFINUMsQ0FLRSx3QkFBQyxLQUFEO01BQUcsTUFBSztNQUFJLFVBQVUsTUFBTSxFQUFFLGdCQUFnQjtnQkFBOUM7T0FDRSx3QkFBQyxLQUFELEVBQUcsV0FBVSxzQkFBeUI7Ozs7OztPQUFTO09BQy9DLHdCQUFDLEtBQUQ7UUFBRyxXQUFVO1FBQW9CLE9BQU8sRUFBRSxVQUFVLFVBQVU7UUFBTTs7Ozs7T0FDbEU7Ozs7O2VBQ0gsZ0JBQ0Msd0JBQUMsTUFBRDtNQUFJLFdBQVU7Z0JBQ1gsV0FDQztPQUNFLHdCQUFDLE1BQUQsWUFBSSx3QkFBQyxNQUFEO1FBQU0sSUFBRztrQkFBVCxDQUFvQix3QkFBQyxLQUFEO1NBQUcsV0FBVTtTQUFjLE9BQU87VUFBRSxPQUFPO1VBQWlCLE9BQU87VUFBSTtTQUFNOzs7O2dDQUFrQjs7Ozs7aUJBQUs7Ozs7O09BQzVILHdCQUFDLE1BQUQsWUFBSSx3QkFBQyxNQUFEO1FBQU0sSUFBRztrQkFBVCxDQUFtQix3QkFBQyxLQUFEO1NBQUcsV0FBVTtTQUFhLE9BQU87VUFBRSxPQUFPO1VBQWlCLE9BQU87VUFBSTtTQUFNOzs7OytCQUFpQjs7Ozs7aUJBQUs7Ozs7O09BQ3pILHdCQUFDLE1BQUQsWUFBSSx3QkFBQyxNQUFELEVBQUksV0FBVSxXQUFZOzs7O2lCQUFLOzs7OztPQUNuQyx3QkFBQyxNQUFELFlBQUksd0JBQUMsVUFBRDtRQUFRLFdBQVU7UUFBZSxTQUFTO2tCQUExQyxDQUF3RCx3QkFBQyxLQUFEO1NBQUcsV0FBVTtTQUFzQixPQUFPLEVBQUUsT0FBTyxJQUFJO1NBQU07Ozs7NEJBQWdCOzs7OztpQkFBSzs7Ozs7T0FDN0ksb0JBRUg7T0FDRSx3QkFBQyxNQUFELFlBQUksd0JBQUMsTUFBRDtRQUFNLElBQUc7a0JBQVQsQ0FBa0Isd0JBQUMsS0FBRDtTQUFHLFdBQVU7U0FBcUIsT0FBTztVQUFFLE9BQU87VUFBaUIsT0FBTztVQUFJO1NBQU07Ozs7b0NBQXNCOzs7OztpQkFBSzs7Ozs7T0FDckksd0JBQUMsTUFBRCxZQUFJLHdCQUFDLE1BQUQ7UUFBTSxJQUFHO2tCQUFULENBQXFCLHdCQUFDLEtBQUQ7U0FBRyxXQUFVO1NBQW1CLE9BQU87VUFBRSxPQUFPO1VBQVcsT0FBTztVQUFJO1NBQU07Ozs7dUNBQXlCOzs7OztpQkFBSzs7Ozs7T0FDbkksd0JBQUMsTUFBRCxZQUFJLHdCQUFDLE1BQUQsRUFBSSxXQUFVLFdBQVk7Ozs7aUJBQUs7Ozs7O09BQ25DLHdCQUFDLE1BQUQsWUFBSSx3QkFBQyxLQUFEO1FBQUcsTUFBSztrQkFBUixDQUF3Qix3QkFBQyxLQUFEO1NBQUcsV0FBVTtTQUFlLE9BQU87VUFBRSxPQUFPO1VBQWlCLE9BQU87VUFBSTtTQUFNOzs7O2tDQUFpQjs7Ozs7aUJBQUs7Ozs7O09BQ2hJLHdCQUFDLE1BQUQsWUFBSSx3QkFBQyxLQUFEO1FBQUcsTUFBSztrQkFBUixDQUEyQix3QkFBQyxLQUFEO1NBQUcsV0FBVTtTQUFlLE9BQU87VUFBRSxPQUFPO1VBQVcsT0FBTztVQUFJO1NBQU07Ozs7cUNBQW9COzs7OztpQkFBSzs7Ozs7T0FDaEksd0JBQUMsTUFBRCxZQUFJLHdCQUFDLE1BQUQsRUFBSSxXQUFVLFdBQVk7Ozs7aUJBQUs7Ozs7O09BQ25DLHdCQUFDLE1BQUQsWUFBSSx3QkFBQyxLQUFEO1FBQUcsTUFBSztrQkFBUixDQUF1Qix3QkFBQyxLQUFEO1NBQUcsV0FBVTtTQUFvQixPQUFPO1VBQUUsT0FBTztVQUF5QixPQUFPO1VBQUk7U0FBTTs7OztpQ0FBZ0I7Ozs7O2lCQUFLOzs7OztPQUMxSTtNQUVGOzs7O2NBRUo7Ozs7OztJQUVKLENBQUMsWUFDQSx3QkFBQyxNQUFELFlBQ0Usd0JBQUMsTUFBRDtLQUNFLElBQUc7S0FDSCxPQUFPO01BQ0wsWUFBWTtNQUFpQixPQUFPO01BQ3BDLFlBQVk7TUFBSyxjQUFjO01BQy9CLFNBQVM7TUFDVjtlQUNGO0tBRU07Ozs7Y0FDSjs7Ozs7SUFFSjs7Ozs7V0FDRCIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJOYXZiYXIuanN4Il0sInZlcnNpb24iOjMsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgeyBMaW5rIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XHJcbmltcG9ydCB7IGlzTG9nZ2VkSW4sIGNsZWFyVG9rZW4gfSBmcm9tICcuLi91dGlscy9hcGknO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTmF2YmFyKCkge1xyXG4gIGNvbnN0IFtkcm9wZG93bk9wZW4sIHNldERyb3Bkb3duT3Blbl0gPSB1c2VTdGF0ZShmYWxzZSk7XHJcbiAgY29uc3QgbG9nZ2VkSW4gPSBpc0xvZ2dlZEluKCk7XHJcblxyXG4gIGNvbnN0IGhhbmRsZUxvZ291dCA9ICgpID0+IHtcclxuICAgIGNsZWFyVG9rZW4oKTtcclxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJy9sb2dpbic7XHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIChcclxuICAgIDxuYXYgY2xhc3NOYW1lPVwiZWthcnQtbmF2XCI+XHJcbiAgICAgIDxMaW5rIHRvPVwiL1wiIGNsYXNzTmFtZT1cIm5hdi1icmFuZFwiPlxyXG4gICAgICAgIDxpIGNsYXNzTmFtZT1cImZhcyBmYS1zaG9wcGluZy1jYXJ0XCIgc3R5bGU9e3sgZm9udFNpemU6ICcxLjFyZW0nIH19PjwvaT5cclxuICAgICAgICBFazxzcGFuPmFydDwvc3Bhbj5cclxuICAgICAgPC9MaW5rPlxyXG5cclxuICAgICAgPHVsIGNsYXNzTmFtZT1cIm5hdi1saW5rc1wiPlxyXG4gICAgICAgIDxsaT48TGluayB0bz1cIi9wcm9kdWN0c1wiPlNob3A8L0xpbms+PC9saT5cclxuXHJcbiAgICAgICAgPGxpXHJcbiAgICAgICAgICBjbGFzc05hbWU9XCJkcm9wZG93blwiXHJcbiAgICAgICAgICBvbk1vdXNlRW50ZXI9eygpID0+IHNldERyb3Bkb3duT3Blbih0cnVlKX1cclxuICAgICAgICAgIG9uTW91c2VMZWF2ZT17KCkgPT4gc2V0RHJvcGRvd25PcGVuKGZhbHNlKX1cclxuICAgICAgICA+XHJcbiAgICAgICAgICA8YSBocmVmPVwiI1wiIG9uQ2xpY2s9eyhlKSA9PiBlLnByZXZlbnREZWZhdWx0KCl9PlxyXG4gICAgICAgICAgICA8aSBjbGFzc05hbWU9XCJmYXMgZmEtdXNlci1jaXJjbGVcIj48L2k+IEFjY291bnR7JyAnfVxyXG4gICAgICAgICAgICA8aSBjbGFzc05hbWU9XCJmYXMgZmEtYW5nbGUtZG93blwiIHN0eWxlPXt7IGZvbnRTaXplOiAnLjY1cmVtJyB9fT48L2k+XHJcbiAgICAgICAgICA8L2E+XHJcbiAgICAgICAgICB7ZHJvcGRvd25PcGVuICYmIChcclxuICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cImRyb3Bkb3duLW1lbnUgdmlzaWJsZVwiPlxyXG4gICAgICAgICAgICAgIHtsb2dnZWRJbiA/IChcclxuICAgICAgICAgICAgICAgIDw+XHJcbiAgICAgICAgICAgICAgICAgIDxsaT48TGluayB0bz1cIi9wcm9maWxlXCI+PGkgY2xhc3NOYW1lPVwiZmFzIGZhLXVzZXJcIiBzdHlsZT17eyBjb2xvcjogJ3ZhcigtLXllbGxvdyknLCB3aWR0aDogMTQgfX0+PC9pPiBNeSBQcm9maWxlPC9MaW5rPjwvbGk+XHJcbiAgICAgICAgICAgICAgICAgIDxsaT48TGluayB0bz1cIi9vcmRlcnNcIj48aSBjbGFzc05hbWU9XCJmYXMgZmEtYm94XCIgc3R5bGU9e3sgY29sb3I6ICd2YXIoLS15ZWxsb3cpJywgd2lkdGg6IDE0IH19PjwvaT4gTXkgT3JkZXJzPC9MaW5rPjwvbGk+XHJcbiAgICAgICAgICAgICAgICAgIDxsaT48aHIgY2xhc3NOYW1lPVwiZGl2aWRlclwiIC8+PC9saT5cclxuICAgICAgICAgICAgICAgICAgPGxpPjxidXR0b24gY2xhc3NOYW1lPVwiZHJvcGRvd24tYnRuXCIgb25DbGljaz17aGFuZGxlTG9nb3V0fT48aSBjbGFzc05hbWU9XCJmYXMgZmEtc2lnbi1vdXQtYWx0XCIgc3R5bGU9e3sgd2lkdGg6IDE0IH19PjwvaT4gTG9nb3V0PC9idXR0b24+PC9saT5cclxuICAgICAgICAgICAgICAgIDwvPlxyXG4gICAgICAgICAgICAgICkgOiAoXHJcbiAgICAgICAgICAgICAgICA8PlxyXG4gICAgICAgICAgICAgICAgICA8bGk+PExpbmsgdG89XCIvbG9naW5cIj48aSBjbGFzc05hbWU9XCJmYXMgZmEtc2lnbi1pbi1hbHRcIiBzdHlsZT17eyBjb2xvcjogJ3ZhcigtLXllbGxvdyknLCB3aWR0aDogMTQgfX0+PC9pPiBDdXN0b21lciBMb2dpbjwvTGluaz48L2xpPlxyXG4gICAgICAgICAgICAgICAgICA8bGk+PExpbmsgdG89XCIvcmVnaXN0ZXJcIj48aSBjbGFzc05hbWU9XCJmYXMgZmEtdXNlci1wbHVzXCIgc3R5bGU9e3sgY29sb3I6ICcjN2RjOTdkJywgd2lkdGg6IDE0IH19PjwvaT4gQ3VzdG9tZXIgUmVnaXN0ZXI8L0xpbms+PC9saT5cclxuICAgICAgICAgICAgICAgICAgPGxpPjxociBjbGFzc05hbWU9XCJkaXZpZGVyXCIgLz48L2xpPlxyXG4gICAgICAgICAgICAgICAgICA8bGk+PGEgaHJlZj1cIi92ZW5kb3IvbG9naW5cIj48aSBjbGFzc05hbWU9XCJmYXMgZmEtc3RvcmVcIiBzdHlsZT17eyBjb2xvcjogJ3ZhcigtLXllbGxvdyknLCB3aWR0aDogMTQgfX0+PC9pPiBWZW5kb3IgTG9naW48L2E+PC9saT5cclxuICAgICAgICAgICAgICAgICAgPGxpPjxhIGhyZWY9XCIvdmVuZG9yL3JlZ2lzdGVyXCI+PGkgY2xhc3NOYW1lPVwiZmFzIGZhLXN0b3JlXCIgc3R5bGU9e3sgY29sb3I6ICcjN2RjOTdkJywgd2lkdGg6IDE0IH19PjwvaT4gVmVuZG9yIFJlZ2lzdGVyPC9hPjwvbGk+XHJcbiAgICAgICAgICAgICAgICAgIDxsaT48aHIgY2xhc3NOYW1lPVwiZGl2aWRlclwiIC8+PC9saT5cclxuICAgICAgICAgICAgICAgICAgPGxpPjxhIGhyZWY9XCIvYWRtaW4vbG9naW5cIj48aSBjbGFzc05hbWU9XCJmYXMgZmEtc2hpZWxkLWFsdFwiIHN0eWxlPXt7IGNvbG9yOiAncmdiYSgyNTUsMjU1LDI1NSwwLjQpJywgd2lkdGg6IDE0IH19PjwvaT4gQWRtaW4gTG9naW48L2E+PC9saT5cclxuICAgICAgICAgICAgICAgIDwvPlxyXG4gICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgIDwvdWw+XHJcbiAgICAgICAgICApfVxyXG4gICAgICAgIDwvbGk+XHJcblxyXG4gICAgICAgIHshbG9nZ2VkSW4gJiYgKFxyXG4gICAgICAgICAgPGxpPlxyXG4gICAgICAgICAgICA8TGlua1xyXG4gICAgICAgICAgICAgIHRvPVwiL3JlZ2lzdGVyXCJcclxuICAgICAgICAgICAgICBzdHlsZT17e1xyXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJ3ZhcigtLXllbGxvdyknLCBjb2xvcjogJyMxYTEwMDAnLFxyXG4gICAgICAgICAgICAgICAgZm9udFdlaWdodDogNzAwLCBib3JkZXJSYWRpdXM6ICc1MHB4JyxcclxuICAgICAgICAgICAgICAgIHBhZGRpbmc6ICcuNDVyZW0gMS4ycmVtJyxcclxuICAgICAgICAgICAgICB9fVxyXG4gICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgUmVnaXN0ZXJcclxuICAgICAgICAgICAgPC9MaW5rPlxyXG4gICAgICAgICAgPC9saT5cclxuICAgICAgICApfVxyXG4gICAgICA8L3VsPlxyXG4gICAgPC9uYXY+XHJcbiAgKTtcclxufSJdfQ==
