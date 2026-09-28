package com.projeto.oficinas_backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.projeto.oficinas_backend.models.Gravacao;

public interface GravacaoRepository extends JpaRepository<Gravacao, Long> {
    List<Gravacao> findByProfessorIdOrderByCreatedAtDesc(Long professorId);
}