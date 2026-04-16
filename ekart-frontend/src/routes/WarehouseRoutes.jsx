/**
 * LOCATION: ekart-frontend/src/routes/WarehouseRoutes.jsx
 * 
 * Consolidated warehouse routes for integrated WarehouseApp.jsx
 * All warehouse functionality (login, dashboard, assignment) is now in WarehouseApp
 * 
 * Usage in App.jsx:
 * 
 * import WarehouseApp from './pages/WarehouseApp';
 * 
 * Add this route in your <Routes>:
 * 
 * <Route path="/warehouse/*" element={<WarehouseApp />} />
 */

export const WarehouseRoutes = [
  {
    path: '/warehouse/*',
    component: 'WarehouseApp',
    description: 'Consolidated warehouse staff application - login, dashboard, and order assignment',
  },
];
