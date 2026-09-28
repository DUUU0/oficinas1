import { BrowserRouter, Routes, Route } from "react-router-dom";

import { PrivateRoute } from "./privateRoutes";
import { AdminRoute } from "./adminRoutes";


import Login from "../pages/Login";
import Dashboard from "../pages/DashboardAluno";
import CadastroAluno from "../pages/CadastroAluno";
import DashboardAdmin from "../pages/DashboardAdmin";

function RoutesApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/cadastroAluno" element={<CadastroAluno />} />

        <Route
          path="/dashboardAluno"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboardAdmin"
          element={
            <PrivateRoute>
              <AdminRoute>
                <DashboardAdmin />
              </AdminRoute>
            </PrivateRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default RoutesApp;