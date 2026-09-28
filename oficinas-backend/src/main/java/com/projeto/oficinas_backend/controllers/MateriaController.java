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

import com.projeto.oficinas_backend.dtos.MateriaRequestDto;
import com.projeto.oficinas_backend.dtos.MateriaResponseDto;
import com.projeto.oficinas_backend.models.Materia;
import com.projeto.oficinas_backend.repositories.MateriaRepository;

@RestController
@RequestMapping("/materias")
public class MateriaController {

    private final MateriaRepository materiaRepository;

    public MateriaController(MateriaRepository materiaRepository) {
        this.materiaRepository = materiaRepository;
    }

    private MateriaResponseDto toDto(Materia materia) {
        return new MateriaResponseDto(materia.getId(), materia.getNome());
    }

    @PostMapping
    public ResponseEntity<Object> createMateria(@RequestBody MateriaRequestDto dto) {
        if (dto.nome() == null || dto.nome().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("O nome da matéria é obrigatório.");
        }

        Materia materia = new Materia();
        materia.setNome(dto.nome());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(materiaRepository.save(materia)));
    }

    @GetMapping
    public ResponseEntity<List<MateriaResponseDto>> getAllMaterias() {
        return ResponseEntity.ok(materiaRepository.findAll().stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getMateriaById(@PathVariable Long id) {
        return materiaRepository.findById(id)
                .map(materia -> ResponseEntity.ok((Object) toDto(materia)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Matéria não encontrada."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> putMateria(@PathVariable Long id, @RequestBody MateriaRequestDto dto) {
        Optional<Materia> materiaOptional = materiaRepository.findById(id);
        if (materiaOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Matéria não existe!");
        }
        if (dto.nome() == null || dto.nome().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("O nome da matéria é obrigatório.");
        }

        Materia materia = materiaOptional.get();
        materia.setNome(dto.nome());
        return ResponseEntity.ok(toDto(materiaRepository.save(materia)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteMateria(@PathVariable Long id) {
        Optional<Materia> materiaOptional = materiaRepository.findById(id);
        if (materiaOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Matéria não existe!");
        }
        materiaRepository.delete(materiaOptional.get());
        return ResponseEntity.ok("Matéria removida com sucesso!");
    }
}