import React, { useEffect, useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import userService from "../../services/UserService";
import { apiClient } from "../../services/api";
import styles from "./styles.module.scss";

interface Materia {
  id: number;
  nome: string;
}

interface Professor {
  id: number;
  nome: string;
  materiaId: number | null;
  materiaNome: string | null;
  gravacaoAutomatica: boolean;
}

interface Face {
  id: number;
  professorId: number;
  encoding: string;
}

export const DashboardAluno: React.FC = () => {
  const username = userService.getUsername() || "Aluno";

  const [materias, setMaterias] = useState<Materia[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [faces, setFaces] = useState<Face[]>([]);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [materiasRes, professoresRes] = await Promise.all([
          apiClient.get<Materia[]>("/materias"),
          apiClient.get<Professor[]>("/professores"),
        ]);
        if (active) {
          setMaterias(materiasRes.data);
          setProfessores(professoresRes.data);
        }
      } catch {
        if (active) {
          toast.error("Falha ao carregar as matérias e professores.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }

      try {
        const facesRes = await apiClient.get<Face[]>("/faces");
        if (active) {
          setFaces(facesRes.data);
        }
      } catch {
        if (active) {
          setFaces([]);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const selectedMateria = materias.find((m) => m.id === selectedMateriaId) || null;

  const professoresDaMateria = professores.filter(
    (professor) => professor.materiaId === selectedMateriaId
  );

  const countProfessores = (materiaId: number) =>
    professores.filter((professor) => professor.materiaId === materiaId).length;

  const getImageSrc = (professorId: number) => {
    const face = faces.find((item) => item.professorId === professorId);
    return face ? `data:image/jpeg;base64,${face.encoding}` : null;
  };

  const handleLogout = () => {
    userService.logOut();
  };

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
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statTitle}>Matérias disponíveis</span>
            <span className={styles.statValue}>{materias.length}</span>
            <span className={styles.statSubtitle}>Escolha uma para começar</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statTitle}>Professores</span>
            <span className={styles.statValue}>{professores.length}</span>
            <span className={styles.statSubtitle}>Com aulas na plataforma</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statTitle}>Matéria selecionada</span>
            <span className={styles.statValueSmall}>
              {selectedMateria ? selectedMateria.nome : "Nenhuma"}
            </span>
            <span className={styles.statSubtitle}>
              {selectedMateria
                ? `${professoresDaMateria.length} professor(es)`
                : "Selecione ao lado"}
            </span>
          </div>
        </section>

        <div className={styles.dashboardGrid}>
          <section className={styles.listCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Matérias</h2>
                <p>Selecione a matéria que deseja estudar.</p>
              </div>
            </div>

            <div className={styles.scrollList}>
              {loading ? (
                <p className={styles.emptyText}>Carregando matérias...</p>
              ) : materias.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma matéria disponível.</p>
              ) : (
                materias.map((materia) => (
                  <button
                    key={materia.id}
                    type="button"
                    className={`${styles.materiaItem} ${materia.id === selectedMateriaId ? styles.materiaActive : ""
                      }`}
                    onClick={() => setSelectedMateriaId(materia.id)}
                  >
                    <span className={styles.materiaName}>{materia.nome}</span>
                    <span className={styles.materiaCount}>
                      {countProfessores(materia.id)} professor(es)
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className={styles.listCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>
                  {selectedMateria
                    ? `Professores de ${selectedMateria.nome}`
                    : "Professores"}
                </h2>
                <p>
                  {selectedMateria
                    ? "Selecione um professor para acessar as aulas."
                    : "Escolha uma matéria para ver os professores."}
                </p>
              </div>
            </div>

            <div className={styles.scrollList}>
              {!selectedMateria ? (
                <p className={styles.emptyText}>Nenhuma matéria selecionada.</p>
              ) : professoresDaMateria.length === 0 ? (
                <p className={styles.emptyText}>
                  Nenhum professor cadastrado para esta matéria.
                </p>
              ) : (
                professoresDaMateria.map((professor) => {
                  const src = getImageSrc(professor.id);
                  return (
                    <div key={professor.id} className={styles.listItem}>
                      <div className={styles.itemInfo}>
                        <div className={styles.avatar}>
                          {src ? (
                            <img src={src} alt={professor.nome} />
                          ) : (
                            <span>{professor.nome.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <h3>{professor.nome}</h3>
                          <span className={styles.materiaTag}>
                            {professor.materiaNome}
                          </span>
                        </div>
                      </div>
                      <div className={styles.itemActions}>
                        <button type="button" className={styles.primaryBtn}>
                          Ver aulas
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardAluno;