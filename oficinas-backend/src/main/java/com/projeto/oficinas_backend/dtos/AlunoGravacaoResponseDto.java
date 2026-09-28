package com.projeto.oficinas_backend.dtos;

public record AlunoGravacaoResponseDto(Long userId, String username, Long gravacaoId, String gravacaoNome,
        Long professorId, String professorNome, Boolean visto) {
}