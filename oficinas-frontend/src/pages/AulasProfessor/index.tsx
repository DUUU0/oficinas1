import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import userService from "../../services/UserService";
import { apiClient } from "../../services/api";
import styles from "./styles.module.scss";

interface Professor {
  id: number;
  nome: string;
  materiaNome: string | null;
}

interface Gravacao {
  id: number;
  nome: string;
  professorId: number;
  professorNome: string;
  urlVideo: string;
  urlPdf: string | null;
  urlLegenda: string | null;
  createdAt: string | null;
}

interface AlunoGravacao {
  gravacaoId: number;
  visto: boolean;
}

// Fração do vídeo a partir da qual a aula é considerada assistida
const WATCHED_THRESHOLD = 0.9;

// O campo urlVideo pode ser uma URL http(s) ou um caminho local (ex: C:\videos\aula.mp4).
// Navegadores não reproduzem caminhos locais, então usamos só o nome do arquivo
// e buscamos no endpoint /videos/** do backend.
const resolveVideoUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  const fileName = url.split(/[\\/]/).pop() ?? url;
  return `${apiClient.defaults.baseURL}/videos/${encodeURIComponent(fileName)}`;
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "";

export const AulasProfessor: React.FC = () => {
  const { professorId } = useParams<{ professorId: string }>();
  const navigate = useNavigate();
  const username = userService.getUsername() || "Aluno";

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [gravacoes, setGravacoes] = useState<Gravacao[]>([]);
  const [vistas, setVistas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [aulaAberta, setAulaAberta] = useState<Gravacao | null>(null);

  // Evita enviar a marcação mais de uma vez enquanto a requisição está em andamento
  const marcandoRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [professorRes, gravacoesRes, vistasRes] = await Promise.all([
          apiClient.get<Professor>(`/professores/${professorId}`),
          apiClient.get<Gravacao[]>(`/gravacoes/professor/${professorId}`),
          apiClient.get<AlunoGravacao[]>("/aluno-gravacoes/me"),
        ]);
        if (active) {
          setProfessor(professorRes.data);
          setGravacoes(gravacoesRes.data);
          setVistas(
            new Set(vistasRes.data.filter((item) => item.visto).map((item) => item.gravacaoId))
          );
        }
      } catch {
        if (active) {
          toast.error("Falha ao carregar as aulas.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [professorId]);

  const marcarComoAssistida = async (gravacaoId: number) => {
    if (vistas.has(gravacaoId) || marcandoRef.current.has(gravacaoId)) return;

    marcandoRef.current.add(gravacaoId);
    try {
      await apiClient.post("/aluno-gravacoes", { gravacaoId, visto: true });
      setVistas((prev) => new Set(prev).add(gravacaoId));
    } catch {
      toast.error("Não foi possível registrar que você assistiu a aula.");
    } finally {
      marcandoRef.current.delete(gravacaoId);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (!aulaAberta || !video.duration) return;

    if (video.currentTime / video.duration >= WATCHED_THRESHOLD) {
      marcarComoAssistida(aulaAberta.id);
    }
  };

  const handleEnded = () => {
    if (aulaAberta) {
      marcarComoAssistida(aulaAberta.id);
    }
  };

  const handleDownloadPdf = (e: React.MouseEvent) => {
    // Download do PDF ainda não implementado; evita abrir o modal ao clicar no botão
    e.stopPropagation();
  };

  const handleLogout = () => {
    userService.logOut();
  };

  const totalVistas = gravacoes.filter((gravacao) => vistas.has(gravacao.id)).length;

  return (
    <div className={styles.dashboardContainer}>
      <Toaster position="top-right" />

      <header className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>PT</div>
          <div>
            <h1>Pan-Tilt Autônomo</h1>
            <span>Aulas Gravadas</span>
          </div>
        </div>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{username}</span>
            <span className={styles.roleBadge}>ALUNO</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/dashboardAluno")}
          >
            Voltar
          </button>
          <div>
            <h2>{professor ? `Aulas de ${professor.nome}` : "Aulas"}</h2>
            <p>
              {professor?.materiaNome
                ? `${professor.materiaNome} · Selecione uma aula para assistir.`
                : "Selecione uma aula para assistir."}
            </p>
          </div>
        </div>

        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statTitle}>Aulas disponíveis</span>
            <span className={styles.statValue}>{gravacoes.length}</span>
            <span className={styles.statSubtitle}>Gravadas por este professor</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statTitle}>Aulas assistidas</span>
            <span className={styles.statValue}>
              {totalVistas}/{gravacoes.length}
            </span>
            <span className={styles.statSubtitle}>Seu progresso</span>
          </div>
        </section>

        <section className={styles.listCard}>
          <div className={styles.cardHeader}>
            <h2>Aulas gravadas</h2>
            <p>Clique em uma aula para abrir o vídeo.</p>
          </div>

          <div className={styles.scrollList}>
            {loading ? (
              <p className={styles.emptyText}>Carregando aulas...</p>
            ) : gravacoes.length === 0 ? (
              <p className={styles.emptyText}>
                Este professor ainda não possui aulas gravadas.
              </p>
            ) : (
              gravacoes.map((gravacao) => {
                const assistida = vistas.has(gravacao.id);
                return (
                  <div
                    key={gravacao.id}
                    role="button"
                    tabIndex={0}
                    className={`${styles.aulaItem} ${assistida ? styles.aulaAssistida : ""}`}
                    onClick={() => setAulaAberta(gravacao)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setAulaAberta(gravacao);
                      }
                    }}
                  >
                    <div className={styles.aulaInfo}>
                      <div className={styles.playIcon}>{assistida ? "✓" : "▶"}</div>
                      <div>
                        <h3>{gravacao.nome}</h3>
                        <div className={styles.tagRow}>
                          {assistida && <span className={styles.statusVista}>Assistida</span>}
                          {gravacao.createdAt && (
                            <span className={styles.dateText}>
                              {formatDate(gravacao.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleDownloadPdf}
                        disabled={!gravacao.urlPdf}
                        title={
                          gravacao.urlPdf
                            ? "Baixar PDF da legenda"
                            : "PDF da legenda indisponível"
                        }
                      >
                        PDF da legenda
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {aulaAberta && (
        <div className={styles.modalOverlay} onClick={() => setAulaAberta(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{aulaAberta.nome}</h2>
                <p>
                  {aulaAberta.professorNome}
                  {vistas.has(aulaAberta.id) ? " · Assistida" : ""}
                </p>
              </div>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setAulaAberta(null)}
              >
                Fechar
              </button>
            </div>

            <video
              key={aulaAberta.id}
              className={styles.video}
              src={resolveVideoUrl(aulaAberta.urlVideo)}
              controls
              autoPlay
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
            >
              Seu navegador não suporta a reprodução de vídeo.
            </video>
          </div>
        </div>
      )}
    </div>
  );
};

export default AulasProfessor;