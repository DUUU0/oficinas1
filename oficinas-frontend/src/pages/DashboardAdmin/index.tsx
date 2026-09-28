import React, { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import { isAxiosError } from "axios";
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
  userId: number | null;
  gravacaoAutomatica: boolean;
}

interface Face {
  id: number;
  professorId: number;
  encoding: string;
}

interface DeleteTarget {
  type: "materia" | "professor";
  id: number;
  nome: string;
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error) && typeof error.response?.data === "string") {
    return error.response.data;
  }
  return fallback;
};

export const DashboardAdmin: React.FC = () => {
  const adminName = userService.getUsername() || "Administrador";

  const [materias, setMaterias] = useState<Materia[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [faces, setFaces] = useState<Face[]>([]);
  const [saving, setSaving] = useState(false);

  const [materiaModalOpen, setMateriaModalOpen] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [materiaNome, setMateriaNome] = useState("");

  const [professorModalOpen, setProfessorModalOpen] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [professorNome, setProfessorNome] = useState("");
  const [professorMateriaId, setProfessorMateriaId] = useState("");
  const [professorGravacaoAuto, setProfessorGravacaoAuto] = useState(true);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const [materiasRes, professoresRes, facesRes] = await Promise.all([
      apiClient.get<Materia[]>("/materias"),
      apiClient.get<Professor[]>("/professores"),
      apiClient.get<Face[]>("/faces"),
    ]);
    setMaterias(materiasRes.data);
    setProfessores(professoresRes.data);
    setFaces(facesRes.data);
  };

  useEffect(() => {
    let active = true;

    const initialLoad = async () => {
      try {
        const [materiasRes, professoresRes, facesRes] = await Promise.all([
          apiClient.get<Materia[]>("/materias"),
          apiClient.get<Professor[]>("/professores"),
          apiClient.get<Face[]>("/faces"),
        ]);
        if (active) {
          setMaterias(materiasRes.data);
          setProfessores(professoresRes.data);
          setFaces(facesRes.data);
        }
      } catch {
        if (active) {
          toast.error("Falha ao carregar os dados do painel.");
        }
      }
    };

    initialLoad();

    return () => {
      active = false;
    };
  }, []);

  const getFace = (professorId: number) =>
    faces.find((face) => face.professorId === professorId);

  const getImageSrc = (professorId: number) => {
    const face = getFace(professorId);
    return face ? `data:image/jpeg;base64,${face.encoding}` : null;
  };

  const openMateriaModal = (materia?: Materia) => {
    setEditingMateria(materia ?? null);
    setMateriaNome(materia?.nome ?? "");
    setMateriaModalOpen(true);
  };

  const closeMateriaModal = () => {
    setMateriaModalOpen(false);
    setEditingMateria(null);
    setMateriaNome("");
  };

  const openProfessorModal = (professor?: Professor) => {
    setEditingProfessor(professor ?? null);
    setProfessorNome(professor?.nome ?? "");
    setProfessorMateriaId(professor?.materiaId ? String(professor.materiaId) : "");
    setProfessorGravacaoAuto(professor?.gravacaoAutomatica ?? true);
    setImageBase64(null);
    setImagePreview(professor ? getImageSrc(professor.id) : null);
    setProfessorModalOpen(true);
  };

  const closeProfessorModal = () => {
    setProfessorModalOpen(false);
    setEditingProfessor(null);
    setProfessorNome("");
    setProfessorMateriaId("");
    setProfessorGravacaoAuto(true);
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("A imagem deve ter no máximo 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMateria = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingMateria) {
        await apiClient.put(`/materias/${editingMateria.id}`, { nome: materiaNome });
        toast.success("Matéria atualizada com sucesso!");
      } else {
        await apiClient.post("/materias", { nome: materiaNome });
        toast.success("Matéria cadastrada com sucesso!");
      }
      await loadData();
      closeMateriaModal();
    } catch (error) {
      toast.error(getErrorMessage(error, "Falha ao salvar a matéria."));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      nome: professorNome,
      materiaId: professorMateriaId ? Number(professorMateriaId) : null,
      gravacaoAutomatica: professorGravacaoAuto,
    };

    try {
      const response = editingProfessor
        ? await apiClient.put<Professor>(`/professores/${editingProfessor.id}`, payload)
        : await apiClient.post<Professor>("/professores", payload);

      const professorId = response.data.id;

      if (imageBase64) {
        const existingFace = getFace(professorId);
        const facePayload = { professorId, encoding: imageBase64 };

        if (existingFace) {
          await apiClient.put(`/faces/${existingFace.id}`, facePayload);
        } else {
          await apiClient.post("/faces", facePayload);
        }
      }

      toast.success(
        editingProfessor
          ? "Professor atualizado com sucesso!"
          : "Professor cadastrado com sucesso!"
      );
      await loadData();
      closeProfessorModal();
    } catch (error) {
      toast.error(getErrorMessage(error, "Falha ao salvar o professor."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);

    try {
      const path = deleteTarget.type === "materia" ? "materias" : "professores";
      await apiClient.delete(`/${path}/${deleteTarget.id}`);
      toast.success(
        deleteTarget.type === "materia"
          ? "Matéria removida com sucesso!"
          : "Professor removido com sucesso!"
      );
      await loadData();
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Falha ao remover o registro."));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    userService.logOut();
  };

  return (
    <div className={styles.adminContainer}>
      <Toaster position="top-right" />

      <header className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>PT</div>
          <div>
            <h1>Painel Administrativo</h1>
            <span>Pan-Tilt Autônomo</span>
          </div>
        </div>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{adminName}</span>
            <span className={styles.roleBadge}>ADMIN</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statTitle}>Matérias</span>
            <span className={styles.statValue}>{materias.length}</span>
            <span className={styles.statSubtitle}>Cadastradas no sistema</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statTitle}>Professores</span>
            <span className={styles.statValue}>{professores.length}</span>
            <span className={styles.statSubtitle}>Com acesso à gravação</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statTitle}>Faces cadastradas</span>
            <span className={styles.statValue}>{faces.length}</span>
            <span className={styles.statSubtitle}>Disponíveis para rastreamento</span>
          </div>
        </section>

        <div className={styles.dashboardGrid}>
          <section className={styles.listCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Matérias</h2>
                <p>Disciplinas disponíveis para vincular aos professores.</p>
              </div>
              <button className={styles.primaryBtn} onClick={() => openMateriaModal()}>
                Nova Matéria
              </button>
            </div>

            <div className={styles.scrollList}>
              {materias.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma matéria cadastrada.</p>
              ) : (
                materias.map((materia) => (
                  <div key={materia.id} className={styles.listItem}>
                    <div className={styles.itemInfo}>
                      <h3>{materia.nome}</h3>
                      <span>
                        {
                          professores.filter((p) => p.materiaId === materia.id)
                            .length
                        }{" "}
                        professor(es) vinculado(s)
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        className={styles.secondaryBtn}
                        onClick={() => openMateriaModal(materia)}
                      >
                        Editar
                      </button>
                      <button
                        className={styles.dangerOutlineBtn}
                        onClick={() =>
                          setDeleteTarget({
                            type: "materia",
                            id: materia.id,
                            nome: materia.nome,
                          })
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={styles.listCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Professores</h2>
                <p>Docentes cadastrados e suas respectivas matérias.</p>
              </div>
              <button className={styles.primaryBtn} onClick={() => openProfessorModal()}>
                Novo Professor
              </button>
            </div>

            <div className={styles.scrollList}>
              {professores.length === 0 ? (
                <p className={styles.emptyText}>Nenhum professor cadastrado.</p>
              ) : (
                professores.map((professor) => {
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
                          <div className={styles.tagRow}>
                            <span className={styles.materiaTag}>
                              {professor.materiaNome || "Sem matéria"}
                            </span>
                            <span
                              className={`${styles.statusTag} ${professor.gravacaoAutomatica
                                ? styles.statusOn
                                : styles.statusOff
                                }`}
                            >
                              {professor.gravacaoAutomatica
                                ? "Gravação automática"
                                : "Gravação manual"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          className={styles.secondaryBtn}
                          onClick={() => openProfessorModal(professor)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.dangerOutlineBtn}
                          onClick={() =>
                            setDeleteTarget({
                              type: "professor",
                              id: professor.id,
                              nome: professor.nome,
                            })
                          }
                        >
                          Excluir
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

      {materiaModalOpen && (
        <div className={styles.modalOverlay} onClick={closeMateriaModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingMateria ? "Editar Matéria" : "Nova Matéria"}</h2>
              <p>Informe o nome da disciplina.</p>
            </div>

            <form onSubmit={handleSaveMateria} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="materiaNome">Nome da matéria</label>
                <input
                  id="materiaNome"
                  type="text"
                  placeholder="ex: Sistemas Embarcados"
                  value={materiaNome}
                  onChange={(e) => setMateriaNome(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={closeMateriaModal}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {professorModalOpen && (
        <div className={styles.modalOverlay} onClick={closeProfessorModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingProfessor ? "Editar Professor" : "Novo Professor"}</h2>
              <p>Preencha os dados do docente e selecione a matéria.</p>
            </div>

            <form onSubmit={handleSaveProfessor} className={styles.form}>
              <div className={styles.imageUpload}>
                <div className={styles.imagePreview}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Pré-visualização" />
                  ) : (
                    <span>Sem imagem</span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? "Alterar imagem" : "Inserir imagem"}
                  </button>
                  <p className={styles.helperText}>PNG ou JPG, até 2 MB.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.hiddenInput}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="professorNome">Nome do professor</label>
                <input
                  id="professorNome"
                  type="text"
                  placeholder="ex: Prof. Eduardo Machado"
                  value={professorNome}
                  onChange={(e) => setProfessorNome(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="professorMateria">Matéria</label>
                <select
                  id="professorMateria"
                  value={professorMateriaId}
                  onChange={(e) => setProfessorMateriaId(e.target.value)}
                >
                  <option value="">Selecione uma matéria</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {materia.nome}
                    </option>
                  ))}
                </select>
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={professorGravacaoAuto}
                  onChange={(e) => setProfessorGravacaoAuto(e.target.checked)}
                />
                <span>Iniciar gravação automaticamente por reconhecimento facial</span>
              </label>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={closeProfessorModal}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Confirmar exclusão</h2>
              <p>
                Deseja realmente excluir <strong>{deleteTarget.nome}</strong>? Esta
                ação não pode ser desfeita.
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleConfirmDelete}
                disabled={saving}
              >
                {saving ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;