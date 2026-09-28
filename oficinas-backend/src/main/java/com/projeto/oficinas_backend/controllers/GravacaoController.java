package com.projeto.oficinas_backend.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.projeto.oficinas_backend.dtos.GravacaoRequestDto;
import com.projeto.oficinas_backend.dtos.GravacaoResponseDto;
import com.projeto.oficinas_backend.models.Gravacao;
import com.projeto.oficinas_backend.models.Professor;
import com.projeto.oficinas_backend.repositories.GravacaoRepository;
import com.projeto.oficinas_backend.repositories.ProfessorRepository;

@RestController
@RequestMapping("/gravacoes")
public class GravacaoController {

    private final GravacaoRepository gravacaoRepository;
    private final ProfessorRepository professorRepository;

    public GravacaoController(GravacaoRepository gravacaoRepository,
                              ProfessorRepository professorRepository) {
        this.gravacaoRepository = gravacaoRepository;
        this.professorRepository = professorRepository;
    }

    private GravacaoResponseDto toDto(Gravacao gravacao) {
        Professor professor = gravacao.getProfessor();
        return new GravacaoResponseDto(
                gravacao.getId(),
                gravacao.getNome(),
                professor.getId(),
                professor.getNome(),
                gravacao.getUrlVideo(),
                gravacao.getUrlPdf(),
                gravacao.getUrlLegenda(),
                gravacao.getCreatedAt());
    }

    private String aplicarDados(Gravacao gravacao, GravacaoRequestDto dto) {
        if (dto.nome() == null || dto.nome().isBlank()) {
            return "O nome da gravação é obrigatório.";
        }
        if (dto.professorId() == null) {
            return "O professor é obrigatório.";
        }
        if (dto.urlVideo() == null || dto.urlVideo().isBlank()) {
            return "A URL do vídeo é obrigatória.";
        }

        Optional<Professor> professor = professorRepository.findById(dto.professorId());
        if (professor.isEmpty()) {
            return "Professor não encontrado.";
        }

        gravacao.setNome(dto.nome());
        gravacao.setProfessor(professor.get());
        gravacao.setUrlVideo(dto.urlVideo());
        gravacao.setUrlPdf(dto.urlPdf());
        gravacao.setUrlLegenda(dto.urlLegenda());
        return null;
    }

    @PostMapping
    public ResponseEntity<Object> createGravacao(@RequestBody GravacaoRequestDto dto) {
        Gravacao gravacao = new Gravacao();
        String erro = aplicarDados(gravacao, dto);
        if (erro != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erro);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(gravacaoRepository.save(gravacao)));
    }

    @GetMapping
    public ResponseEntity<List<GravacaoResponseDto>> getAllGravacoes() {
        return ResponseEntity.ok(gravacaoRepository.findAll().stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getGravacaoById(@PathVariable Long id) {
        return gravacaoRepository.findById(id)
                .map(gravacao -> ResponseEntity.ok((Object) toDto(gravacao)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Gravação não encontrada."));
    }

    @GetMapping("/professor/{professorId}")
    public ResponseEntity<List<GravacaoResponseDto>> getGravacoesByProfessor(@PathVariable Long professorId) {
        return ResponseEntity.ok(gravacaoRepository.findByProfessorIdOrderByCreatedAtDesc(professorId)
                .stream().map(this::toDto).toList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> putGravacao(@PathVariable Long id, @RequestBody GravacaoRequestDto dto) {
        Optional<Gravacao> gravacaoOptional = gravacaoRepository.findById(id);
        if (gravacaoOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Gravação não existe!");
        }

        Gravacao gravacao = gravacaoOptional.get();
        String erro = aplicarDados(gravacao, dto);
        if (erro != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erro);
        }
        return ResponseEntity.ok(toDto(gravacaoRepository.save(gravacao)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteGravacao(@PathVariable Long id) {
        Optional<Gravacao> gravacaoOptional = gravacaoRepository.findById(id);
        if (gravacaoOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Gravação não existe!");
        }
        gravacaoRepository.delete(gravacaoOptional.get());
        return ResponseEntity.ok("Gravação removida com sucesso!");
    }
}