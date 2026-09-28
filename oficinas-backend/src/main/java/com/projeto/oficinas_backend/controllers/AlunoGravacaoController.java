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

import com.projeto.oficinas_backend.dtos.AlunoGravacaoRequestDto;
import com.projeto.oficinas_backend.dtos.AlunoGravacaoResponseDto;
import com.projeto.oficinas_backend.models.AlunoGravacao;
import com.projeto.oficinas_backend.models.AlunoGravacaoId;
import com.projeto.oficinas_backend.models.Gravacao;
import com.projeto.oficinas_backend.models.User;
import com.projeto.oficinas_backend.repositories.AlunoGravacaoRepository;
import com.projeto.oficinas_backend.repositories.GravacaoRepository;
import com.projeto.oficinas_backend.security.AuthenticatedUser;

@RestController
@RequestMapping("/aluno-gravacoes")
public class AlunoGravacaoController {

    private final AlunoGravacaoRepository alunoGravacaoRepository;
    private final GravacaoRepository gravacaoRepository;
    private final AuthenticatedUser authenticatedUser;

    public AlunoGravacaoController(AlunoGravacaoRepository alunoGravacaoRepository,
                                   GravacaoRepository gravacaoRepository,
                                   AuthenticatedUser authenticatedUser) {
        this.alunoGravacaoRepository = alunoGravacaoRepository;
        this.gravacaoRepository = gravacaoRepository;
        this.authenticatedUser = authenticatedUser;
    }

    private AlunoGravacaoResponseDto toDto(AlunoGravacao ag) {
        Gravacao gravacao = ag.getGravacao();
        return new AlunoGravacaoResponseDto(
                ag.getUser().getId(),
                ag.getUser().getUsername(),
                gravacao.getId(),
                gravacao.getNome(),
                gravacao.getProfessor().getId(),
                gravacao.getProfessor().getNome(),
                ag.getVisto());
    }

    @PostMapping
    public ResponseEntity<Object> marcar(@RequestBody AlunoGravacaoRequestDto dto) {
        if (dto.gravacaoId() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("A gravação é obrigatória.");
        }

        Optional<Gravacao> gravacaoOptional = gravacaoRepository.findById(dto.gravacaoId());
        if (gravacaoOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Gravação não encontrada.");
        }

        User user = authenticatedUser.getUsuarioLogado();
        AlunoGravacaoId id = new AlunoGravacaoId(user.getId(), dto.gravacaoId());

        Optional<AlunoGravacao> existente = alunoGravacaoRepository.findById(id);
        boolean novo = existente.isEmpty();

        AlunoGravacao alunoGravacao = existente.orElseGet(AlunoGravacao::new);
        if (novo) {
            alunoGravacao.setId(id);
            alunoGravacao.setUser(user);
            alunoGravacao.setGravacao(gravacaoOptional.get());
        }
        if (dto.visto() != null) {
            alunoGravacao.setVisto(dto.visto());
        }

        AlunoGravacao salvo = alunoGravacaoRepository.save(alunoGravacao);
        return ResponseEntity.status(novo ? HttpStatus.CREATED : HttpStatus.OK).body(toDto(salvo));
    }

    @GetMapping("/me")
    public ResponseEntity<List<AlunoGravacaoResponseDto>> getMinhasGravacoes() {
        Long userId = authenticatedUser.getUsuarioLogadoId();
        return ResponseEntity.ok(alunoGravacaoRepository.findByUserId(userId).stream().map(this::toDto).toList());
    }

    @GetMapping("/me/gravacao/{gravacaoId}")
    public ResponseEntity<Object> getMinhaGravacao(@PathVariable Long gravacaoId) {
        AlunoGravacaoId id = new AlunoGravacaoId(authenticatedUser.getUsuarioLogadoId(), gravacaoId);
        return alunoGravacaoRepository.findById(id)
                .map(ag -> ResponseEntity.ok((Object) toDto(ag)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Registro não encontrado."));
    }

    @PutMapping("/gravacao/{gravacaoId}")
    public ResponseEntity<Object> putVisto(@PathVariable Long gravacaoId, @RequestBody AlunoGravacaoRequestDto dto) {
        if (dto.visto() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("O campo 'visto' é obrigatório.");
        }

        AlunoGravacaoId id = new AlunoGravacaoId(authenticatedUser.getUsuarioLogadoId(), gravacaoId);
        Optional<AlunoGravacao> alunoGravacaoOptional = alunoGravacaoRepository.findById(id);
        if (alunoGravacaoOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Registro não existe!");
        }

        AlunoGravacao alunoGravacao = alunoGravacaoOptional.get();
        alunoGravacao.setVisto(dto.visto());
        return ResponseEntity.ok(toDto(alunoGravacaoRepository.save(alunoGravacao)));
    }

    @DeleteMapping("/gravacao/{gravacaoId}")
    public ResponseEntity<String> deleteMinhaGravacao(@PathVariable Long gravacaoId) {
        AlunoGravacaoId id = new AlunoGravacaoId(authenticatedUser.getUsuarioLogadoId(), gravacaoId);
        Optional<AlunoGravacao> alunoGravacaoOptional = alunoGravacaoRepository.findById(id);
        if (alunoGravacaoOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Registro não existe!");
        }
        alunoGravacaoRepository.delete(alunoGravacaoOptional.get());
        return ResponseEntity.ok("Registro removido com sucesso!");
    }

    @GetMapping("/admin")
    public ResponseEntity<List<AlunoGravacaoResponseDto>> getAll() {
        return ResponseEntity.ok(alunoGravacaoRepository.findAll().stream().map(this::toDto).toList());
    }

    @GetMapping("/admin/user/{userId}")
    public ResponseEntity<List<AlunoGravacaoResponseDto>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(alunoGravacaoRepository.findByUserId(userId).stream().map(this::toDto).toList());
    }

    @GetMapping("/admin/gravacao/{gravacaoId}")
    public ResponseEntity<List<AlunoGravacaoResponseDto>> getByGravacao(@PathVariable Long gravacaoId) {
        return ResponseEntity.ok(alunoGravacaoRepository.findByGravacaoId(gravacaoId).stream().map(this::toDto).toList());
    }
}