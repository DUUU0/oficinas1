import { apiClient } from "./api";

export type RoleUser = "admin" | "professor" | "aluno";

type LoginCredentials = {
  email: string;
  password: string;
}

type RegisterData = {
  username: string;
  email: string;
  password: string;
}

type AuthResponse = {
  token: string;
  role?: RoleUser;
  tipo?: RoleUser;
  username: string;
}

type RegisterResponse = {
  id: number;
  username: string;
  email: string;
  tipo: RoleUser;
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

  // Cadastro público: o backend sempre cria o usuário com o papel "aluno"
  async register(data: RegisterData): Promise<RegisterResponse> {
    try {
      const { data: user } = await apiClient.post<RegisterResponse>("/auth/register", data);
      return user;
    } catch (error) {
      console.error("Falha no cadastro:", error);
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
    window.location.href = "/";
  }
}

export default new UserService();