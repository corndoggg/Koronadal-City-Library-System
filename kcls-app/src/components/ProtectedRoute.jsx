import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles, allowedPositions }) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.Role)) return <Navigate to="/login" replace />;
  // For Staff, check allowedPositions if provided
  if (
    user.Role === "Staff" &&
    allowedPositions &&
    (!user.staff?.Position || !allowedPositions.includes(user.staff.Position))
  ) {
    return <Navigate to="/login" replace />;
  }
  // For Borrower, check status
  if (
    user.Role === "Borrower" &&
    (user.borrower?.AccountStatus === "Pending" || user.borrower?.AccountStatus === "Rejected")
  ) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}