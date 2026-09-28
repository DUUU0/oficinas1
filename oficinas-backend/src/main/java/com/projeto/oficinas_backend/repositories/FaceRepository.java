package com.projeto.oficinas_backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.projeto.oficinas_backend.models.Face;

public interface FaceRepository extends JpaRepository<Face, Long> {
    List<Face> findByProfessorId(Long professorId);
}