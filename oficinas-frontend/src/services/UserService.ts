import { apiClient } from "./api";

export type RoleUser = "admin" | "professor" | "aluno";

type LoginCredentials = {
  email: string;
  password: string;
}

type AuthResponse = {
  token: string;
  role?: RoleUser;
  tipo?: RoleUser;
  username: string;
}

class UserService {

  async login(credentials: LoginCredentials): Promise<AuthResponse | null> {
    try {
      const { data } = await apiClient.post<AuthResponse>("/auth/login", credentials);

      if (data && data.token) {
        // Trata tanto 'tipo' quanto 'role' vindos do backend
        const userRole = data.tipo || data.role || "";

        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("role", userRole);
        sessionStorage.setItem("username", data.username);
        return data;
      }
      return null;
    } catch (error) {
      console.error("Falha na autenticação:", error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    const token = sessionStorage.getItem("token");
    return !!token && token !== "undefined" && token !== "null";
  }

  isAdmin(): boolean {
    return this.getRole() === "admin";
  }

  isProfessor(): boolean {
    return this.getRole() === "professor";
  }

  isAluno(): boolean {
    return this.getRole() === "aluno";
  }

  getRole(): RoleUser | null {
    return sessionStorage.getItem("role") as RoleUser | null;
  }

  getUsername(): string | null {
    return sessionStorage.getItem("username");
  }

  logOut() {
    sessionStorage.clear();
    window.location.href = "/login";
  }
}

export default new UserService();