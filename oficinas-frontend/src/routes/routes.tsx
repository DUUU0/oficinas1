import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivateRoute } from "./privateRoutes";


import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";

function RoutesApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />


      </Routes>
    </BrowserRouter>
  );
}

export default RoutesApp;