package com.projeto.oficinas_backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.projeto.oficinas_backend.models.AlunoGravacao;
import com.projeto.oficinas_backend.models.AlunoGravacaoId;

public interface AlunoGravacaoRepository extends JpaRepository<AlunoGravacao, AlunoGravacaoId> {
    List<AlunoGravacao> findByUserId(Long userId);

    List<AlunoGravacao> findByGravacaoId(Long gravacaoId);
}