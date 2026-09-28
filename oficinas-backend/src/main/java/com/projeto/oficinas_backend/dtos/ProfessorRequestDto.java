package com.projeto.oficinas_backend.dtos;

public record ProfessorRequestDto(String nome, Long materiaId, Long userId, Boolean gravacaoAutomatica) {
}