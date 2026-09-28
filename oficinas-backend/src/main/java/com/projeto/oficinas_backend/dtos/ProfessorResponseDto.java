package com.projeto.oficinas_backend.dtos;

public record ProfessorResponseDto(Long id, String nome, Long materiaId, String materiaNome,
        Boolean gravacaoAutomatica) {
}