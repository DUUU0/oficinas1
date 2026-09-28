import { Navigate } from "react-router-dom";
import userService from "../services/UserService";
import React from "react";

type AdminRouteProps = {
  children: React.ReactNode;
};

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const isAdmin = userService.isAdmin();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};