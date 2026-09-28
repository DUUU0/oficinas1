package com.projeto.oficinas_backend.models;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlunoGravacaoId implements Serializable {

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "gravacao_id")
    private Long gravacaoId;
}