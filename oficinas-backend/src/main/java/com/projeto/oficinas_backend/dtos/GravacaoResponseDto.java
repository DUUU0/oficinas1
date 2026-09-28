package com.projeto.oficinas_backend.dtos;

import java.time.LocalDateTime;

public record GravacaoResponseDto(Long id, String nome, Long professorId, String professorNome,
        String urlVideo, String urlPdf, String urlLegenda, LocalDateTime createdAt) {
}