import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import userService from "../../services/UserService";
import styles from "./styles.module.scss";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await userService.login({ email, password });

      if (response) {
        toast.success("Login realizado com sucesso!", {
          duration: 2000,
        });

        // Redireciona diretamente para o Dashboard após o login
        navigate("/dashboard");
      } else {
        toast.error("Credenciais inválidas. Tente novamente.");
      }
    } catch {
      toast.error("Falha na autenticação. Verifique o e-mail e a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#fff",
            fontSize: "0.875rem",
            borderRadius: "8px",
          },
        }}
      />

      <div className={styles.loginCard}>
        <div className={styles.header}>
          <span className={styles.badge}>UTFPR • Oficinas de Integração 1</span>
          <h1 className={styles.title}>Pan-Tilt Autônomo</h1>
          <p className={styles.subtitle}>
            Rastreamento Facial e Gravação Inteligente de Aulas
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Entrando..." : "Acessar Plataforma"}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Plataforma para acesso de professores, alunos e administradores.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;