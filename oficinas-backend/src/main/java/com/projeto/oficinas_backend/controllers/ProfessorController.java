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

import com.projeto.oficinas_backend.dtos.ProfessorRequestDto;
import com.projeto.oficinas_backend.dtos.ProfessorResponseDto;
import com.projeto.oficinas_backend.models.Materia;
import com.projeto.oficinas_backend.models.Professor;
import com.projeto.oficinas_backend.repositories.MateriaRepository;
import com.projeto.oficinas_backend.repositories.ProfessorRepository;

@RestController
@RequestMapping("/professores")
public class ProfessorController {

    private final ProfessorRepository professorRepository;
    private final MateriaRepository materiaRepository;

    public ProfessorController(ProfessorRepository professorRepository,
                               MateriaRepository materiaRepository) {
        this.professorRepository = professorRepository;
        this.materiaRepository = materiaRepository;
    }

    private ProfessorResponseDto toDto(Professor professor) {
        Materia materia = professor.getMateria();
        return new ProfessorResponseDto(
                professor.getId(),
                professor.getNome(),
                materia != null ? materia.getId() : null,
                materia != null ? materia.getNome() : null,
                professor.getGravacaoAutomatica());
    }

    private String aplicarDados(Professor professor, ProfessorRequestDto dto) {
        if (dto.nome() == null || dto.nome().isBlank()) {
            return "O nome do professor é obrigatório.";
        }
        professor.setNome(dto.nome());

        if (dto.materiaId() != null) {
            Optional<Materia> materia = materiaRepository.findById(dto.materiaId());
            if (materia.isEmpty()) {
                return "Matéria não encontrada.";
            }
            professor.setMateria(materia.get());
        } else {
            professor.setMateria(null);
        }

        if (dto.gravacaoAutomatica() != null) {
            professor.setGravacaoAutomatica(dto.gravacaoAutomatica());
        }
        return null;
    }

    @PostMapping
    public ResponseEntity<Object> createProfessor(@RequestBody ProfessorRequestDto dto) {
        Professor professor = new Professor();
        String erro = aplicarDados(professor, dto);
        if (erro != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erro);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(professorRepository.save(professor)));
    }

    @GetMapping
    public ResponseEntity<List<ProfessorResponseDto>> getAllProfessores() {
        return ResponseEntity.ok(professorRepository.findAll().stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getProfessorById(@PathVariable Long id) {
        return professorRepository.findById(id)
                .map(professor -> ResponseEntity.ok((Object) toDto(professor)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Professor não encontrado."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> putProfessor(@PathVariable Long id, @RequestBody ProfessorRequestDto dto) {
        Optional<Professor> professorOptional = professorRepository.findById(id);
        if (professorOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Professor não existe!");
        }

        Professor professor = professorOptional.get();
        String erro = aplicarDados(professor, dto);
        if (erro != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erro);
        }
        return ResponseEntity.ok(toDto(professorRepository.save(professor)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteProfessor(@PathVariable Long id) {
        Optional<Professor> professorOptional = professorRepository.findById(id);
        if (professorOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Professor não existe!");
        }
        professorRepository.delete(professorOptional.get());
        return ResponseEntity.ok("Professor removido com sucesso!");
    }
}