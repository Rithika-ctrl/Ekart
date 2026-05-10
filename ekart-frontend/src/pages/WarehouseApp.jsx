import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import WarehouseStaffLoginPage from "./WarehouseStaffLoginPage.jsx";
import WarehouseDashboard from "./WarehouseDashboard.jsx";

export default function WarehouseApp() {
  return (
    <Routes>
      <Route path="login" element={<WarehouseStaffLoginPage />} />
      <Route path="dashboard/*" element={<WarehouseDashboard />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}
