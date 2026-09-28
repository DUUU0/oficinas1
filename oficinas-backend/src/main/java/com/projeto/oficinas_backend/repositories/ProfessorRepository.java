package com.projeto.oficinas_backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.projeto.oficinas_backend.models.Professor;

public interface ProfessorRepository extends JpaRepository<Professor, Long> {
}