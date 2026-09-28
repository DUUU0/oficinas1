import { Navigate } from "react-router-dom";
import userService from "../services/UserService";
import React from "react";

type PrivateRouteProps = {
  children: React.ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const isAuthenticated = userService.isAuthenticated();

  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};