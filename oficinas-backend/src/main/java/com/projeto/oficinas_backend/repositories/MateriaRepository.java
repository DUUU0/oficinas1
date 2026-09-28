package com.projeto.oficinas_backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.projeto.oficinas_backend.models.Materia;

public interface MateriaRepository extends JpaRepository<Materia, Long> {
}