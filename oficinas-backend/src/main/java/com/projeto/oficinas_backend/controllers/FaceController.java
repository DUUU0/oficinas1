package com.projeto.oficinas_backend.controllers;

import java.util.Base64;
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

import com.projeto.oficinas_backend.dtos.FaceRequestDto;
import com.projeto.oficinas_backend.dtos.FaceResponseDto;
import com.projeto.oficinas_backend.models.Face;
import com.projeto.oficinas_backend.models.Professor;
import com.projeto.oficinas_backend.repositories.FaceRepository;
import com.projeto.oficinas_backend.repositories.ProfessorRepository;

@RestController
@RequestMapping("/faces")
public class FaceController {

    private final FaceRepository faceRepository;
    private final ProfessorRepository professorRepository;

    public FaceController(FaceRepository faceRepository, ProfessorRepository professorRepository) {
        this.faceRepository = faceRepository;
        this.professorRepository = professorRepository;
    }

    private FaceResponseDto toDto(Face face) {
        return new FaceResponseDto(
                face.getId(),
                face.getProfessor().getId(),
                Base64.getEncoder().encodeToString(face.getEncoding()));
    }

    @PostMapping
    public ResponseEntity<Object> createFace(@RequestBody FaceRequestDto dto) {
        if (dto.professorId() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("O professor é obrigatório.");
        }
        if (dto.encoding() == null || dto.encoding().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("O encoding da face é obrigatório.");
        }

        Optional<Professor> professorOptional = professorRepository.findById(dto.professorId());
        if (professorOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Professor não encontrado.");
        }

        byte[] encoding;
        try {
            encoding = Base64.getDecoder().decode(dto.encoding());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Encoding inválido (esperado Base64).");
        }

        Face face = new Face();
        face.setProfessor(professorOptional.get());
        face.setEncoding(encoding);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(faceRepository.save(face)));
    }

    @GetMapping
    public ResponseEntity<List<FaceResponseDto>> getAllFaces() {
        return ResponseEntity.ok(faceRepository.findAll().stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getFaceById(@PathVariable Long id) {
        return faceRepository.findById(id)
                .map(face -> ResponseEntity.ok((Object) toDto(face)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Face não encontrada."));
    }

    @GetMapping("/professor/{professorId}")
    public ResponseEntity<List<FaceResponseDto>> getFacesByProfessor(@PathVariable Long professorId) {
        return ResponseEntity.ok(faceRepository.findByProfessorId(professorId).stream().map(this::toDto).toList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> putFace(@PathVariable Long id, @RequestBody FaceRequestDto dto) {
        Optional<Face> faceOptional = faceRepository.findById(id);
        if (faceOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Face não existe!");
        }
        if (dto.professorId() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("O professor é obrigatório.");
        }
        if (dto.encoding() == null || dto.encoding().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("O encoding da face é obrigatório.");
        }

        Optional<Professor> professorOptional = professorRepository.findById(dto.professorId());
        if (professorOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Professor não encontrado.");
        }

        byte[] encoding;
        try {
            encoding = Base64.getDecoder().decode(dto.encoding());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Encoding inválido (esperado Base64).");
        }

        Face face = faceOptional.get();
        face.setProfessor(professorOptional.get());
        face.setEncoding(encoding);
        return ResponseEntity.ok(toDto(faceRepository.save(face)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteFace(@PathVariable Long id) {
        Optional<Face> faceOptional = faceRepository.findById(id);
        if (faceOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Face não existe!");
        }
        faceRepository.delete(faceOptional.get());
        return ResponseEntity.ok("Face removida com sucesso!");
    }
}