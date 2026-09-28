import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { isAxiosError } from "axios";
import userService from "../../services/UserService";
import styles from "./styles.module.scss";

export const CadastroAluno: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      await userService.register({ username, email, password });

      toast.success("Cadastro realizado! Faça login para continuar.", {
        duration: 2000,
      });

      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error("Este e-mail já está cadastrado.");
      } else {
        toast.error("Não foi possível concluir o cadastro. Tente novamente.");
      }
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

      <div className={styles.registerCard}>
        <div className={styles.header}>
          <span className={styles.badge}>UTFPR • Oficinas de Integração 1</span>
          <h1 className={styles.title}>Criar conta de aluno</h1>
          <p className={styles.subtitle}>
            Cadastre-se para assistir às aulas gravadas e baixar as transcrições da lousa
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">Nome</label>
            <input
              id="username"
              type="text"
              placeholder="Seu nome completo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

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
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirmar senha</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Cadastrando..." : "Criar conta"}
          </button>
        </form>

        <p className={styles.switchAuth}>
          Já tem uma conta?
          <Link to="/">Entrar</Link>
        </p>

        <div className={styles.footer}>
          <p>Contas de professor e administrador são criadas pela coordenação.</p>
        </div>
      </div>
    </div>
  );
};

export default CadastroAluno;