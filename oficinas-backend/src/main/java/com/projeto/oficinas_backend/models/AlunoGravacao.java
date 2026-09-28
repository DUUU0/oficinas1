package com.projeto.oficinas_backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity(name = "aluno_gravacao")
@Table(name = "aluno_gravacao")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlunoGravacao {

    @EmbeddedId
    private AlunoGravacaoId id = new AlunoGravacaoId();

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @MapsId("gravacaoId")
    @JoinColumn(name = "gravacao_id", nullable = false)
    private Gravacao gravacao;

    @Column(name = "visto")
    private Boolean visto = true;
}