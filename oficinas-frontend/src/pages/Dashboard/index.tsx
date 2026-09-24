import React, { useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import userService from "../../services/UserService";
import styles from "./styles.module.scss";

// Tipagem para os itens de aulas gravadas
interface VideoLesson {
  id: string;
  title: string;
  professor: string;
  date: string;
  duration: string;
  hasPdfTranscription: boolean;
  hasSubtitles: boolean;
}

export const DashboardPage: React.FC = () => {
  const username = userService.getUsername() || "Usuário";
  const role = userService.getRole() || "aluno";

  // Estados simulados do Hardware Pan-Tilt e do Sistema
  const [isRecording, setIsRecording] = useState(false);
  const [autoRecordMode, setAutoRecordMode] = useState(true);
  const [panAngle] = useState(45);
  const [tiltAngle] = useState(12);
  const [targetLocked] = useState(true);

  // Lista simulada de aulas
  const [lessons] = useState<VideoLesson[]>([
    {
      id: "1",
      title: "Arquitetura do Mecanismo Pan-Tilt e Servomotores",
      professor: "Prof. Eduardo Machado",
      date: "24/09/2026",
      duration: "45m 20s",
      hasPdfTranscription: true,
      hasSubtitles: true,
    },
    {
      id: "2",
      title: "Ajuste Fino de Controle PID e Rastreamento Facial",
      professor: "Prof. João Trevisan",
      date: "22/09/2026",
      duration: "58m 10s",
      hasPdfTranscription: true,
      hasSubtitles: true,
    },
    {
      id: "3",
      title: "Visão Computacional Aplicada a Gravação de Aulas",
      professor: "Prof. Pedro Vianna",
      date: "18/09/2026",
      duration: "40m 00s",
      hasPdfTranscription: false,
      hasSubtitles: true,
    },
  ]);

  const handleToggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success("Gravação encerrada e salva com sucesso!");
    } else {
      setIsRecording(true);
      toast.success("Gravação iniciada no suporte Pan-Tilt!");
    }
  };

  const handleToggleAutoRecordMode = () => {
    setAutoRecordMode(!autoRecordMode);
    toast(
      !autoRecordMode
        ? "Modo de Início Automático por Reconhecimento Facial ativado!"
        : "Modo Manual/Gesto 'V' ativado para controle de gravação.",
      { icon: "🎥" }
    );
  };

  const handleDownloadPdf = (title: string) => {
    toast.success(`Baixando transcrição da lousa em PDF: ${title}`);
  };

  const handleLogout = () => {
    userService.logOut();
  };

  return (
    <div className={styles.dashboardContainer}>
      <Toaster position="top-right" />

      {/* Barra de Navegação Superior */}
      <header className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>📹</div>
          <div>
            <h1>Pan-Tilt Autônomo</h1>
            <span>UTFPR • Rastreamento Facial</span>
          </div>
        </div>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{username}</span>
            <span className={`${styles.roleBadge} ${styles[role]}`}>
              {role.toUpperCase()}
            </span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className={styles.mainContent}>
        {/* Cartões de Métricas e Visão Geral */}
        <section className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Status da Câmera</span>
              <span className={`${styles.statusDot} ${styles.active}`}></span>
            </div>
            <div className={styles.metricValue}>Conectada</div>
            <span className={styles.metricSubtitle}>Logitech HD 1080p • 30 FPS</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Eixos de Rotação</span>
              <span className={styles.cardIcon}>⚙️</span>
            </div>
            <div className={styles.metricValue}>
              Pan: {panAngle}° | Tilt: {tiltAngle}°
            </div>
            <span className={styles.metricSubtitle}>Controle PID Ativo</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Aulas Gravadas</span>
              <span className={styles.cardIcon}>📁</span>
            </div>
            <div className={styles.metricValue}>{lessons.length}</div>
            <span className={styles.metricSubtitle}>Aulas cadastradas na plataforma</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Alvo Rastreado</span>
              <span
                className={`${styles.statusDot} ${targetLocked ? styles.active : styles.warning
                  }`}
              ></span>
            </div>
            <div className={styles.metricValue}>
              {targetLocked ? "Rosto Travado" : "Buscando Alvo..."}
            </div>
            <span className={styles.metricSubtitle}>Prioridade: Primeiro detectado</span>
          </div>
        </section>

        {/* Seção de Controle do Hardware Pan-Tilt (Disponível para Professores e Admins) */}
        {(userService.isAdmin() || userService.isProfessor()) && (
          <section className={styles.controlPanel}>
            <h2>Painel de Controle Pan-Tilt</h2>
            <div className={styles.controlGrid}>
              <div className={styles.statusBox}>
                <p>
                  <strong>Status de Gravação:</strong>{" "}
                  <span className={isRecording ? styles.recordingText : ""}>
                    {isRecording ? "● REC - Gravando" : "Pausado / Aguardando"}
                  </span>
                </p>
                <p>
                  <strong>Gesto Específico:</strong> Mão com Sinal de "V" aciona início/fim
                </p>
              </div>

              <div className={styles.actionButtons}>
                <button
                  onClick={handleToggleRecording}
                  className={`${styles.actionBtn} ${isRecording ? styles.dangerBtn : styles.primaryBtn
                    }`}
                >
                  {isRecording ? "Parar Gravação" : "Iniciar Gravação"}
                </button>

                <button
                  onClick={handleToggleAutoRecordMode}
                  className={styles.secondaryBtn}
                >
                  Modo: {autoRecordMode ? "Automático" : "Manual / Gesto"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Listagem de Aulas com Transcrições da Lousa */}
        <section className={styles.lessonsSection}>
          <div className={styles.sectionHeader}>
            <h2>Aulas Disponíveis e Transcrições</h2>
            <p>Selecione uma aula para assistir ao vídeo e baixar o PDF com o texto da lousa.</p>
          </div>

          <div className={styles.lessonsList}>
            {lessons.map((lesson) => (
              <div key={lesson.id} className={styles.lessonCard}>
                <div className={styles.lessonInfo}>
                  <div className={styles.videoBadge}>VÍDEO</div>
                  <div>
                    <h3>{lesson.title}</h3>
                    <p className={styles.metaInfo}>
                      <span>👤 {lesson.professor}</span>
                      <span>📅 {lesson.date}</span>
                      <span>⏱️ {lesson.duration}</span>
                    </p>
                  </div>
                </div>

                <div className={styles.lessonActions}>
                  {lesson.hasPdfTranscription && (
                    <button
                      onClick={() => handleDownloadPdf(lesson.title)}
                      className={styles.pdfBtn}
                      title="Baixar transcrição da escrita em PDF"
                    >
                      📄 Baixar PDF Lousa
                    </button>
                  )}
                  <button
                    onClick={() => toast.success(`Iniciando vídeo: ${lesson.title}`)}
                    className={styles.watchBtn}
                  >
                    ▶ Assistir Aula
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;