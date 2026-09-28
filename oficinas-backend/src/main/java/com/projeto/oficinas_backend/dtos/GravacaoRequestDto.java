package com.projeto.oficinas_backend.dtos;

public record GravacaoRequestDto(String nome, Long professorId, String urlVideo, String urlPdf, String urlLegenda) {
}