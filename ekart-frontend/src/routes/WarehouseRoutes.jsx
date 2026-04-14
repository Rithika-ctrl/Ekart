/**
 * LOCATION: ekart-frontend/src/routes/WarehouseRoutes.jsx
 * 
 * Import these in your App.jsx and add to your <Routes>
 * 
 * Usage in App.jsx:
 * 
 * import WarehouseStaffLoginPage from './pages/WarehouseStaffLoginPage';
 * import WarehouseDashboard from './pages/WarehouseDashboard';
 * import AssignDeliveryBoyPage from './pages/AssignDeliveryBoyPage';
 * 
 * Add these routes in your <Routes>:
 * 
 * <Route path="/warehouse/login" element={<WarehouseStaffLoginPage />} />
 * <Route path="/warehouse/dashboard" element={<WarehouseDashboard />} />
 * <Route path="/warehouse/assign/:orderId" element={<AssignDeliveryBoyPage />} />
 */

export const WarehouseRoutes = [
  {
    path: '/warehouse/login',
    component: 'WarehouseStaffLoginPage',
    description: 'Warehouse staff login page',
  },
  {
    path: '/warehouse/dashboard',
    component: 'WarehouseDashboard',
    description: 'Warehouse manager dashboard - view pending orders, delivery boys, stats',
  },
  {
    path: '/warehouse/assign/:orderId',
    component: 'AssignDeliveryBoyPage',
    description: 'Manually assign delivery boy to order with load balancing',
  },
];
