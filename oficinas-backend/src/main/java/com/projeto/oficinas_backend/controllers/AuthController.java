package com.projeto.oficinas_backend.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.projeto.oficinas_backend.dtos.AuthRequestDto;
import com.projeto.oficinas_backend.models.enums.RoleUser;
import com.projeto.oficinas_backend.repositories.UserRepository;
import com.projeto.oficinas_backend.services.AuthService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody AuthRequestDto dto) {
        try {
            return ResponseEntity.ok(authService.login(dto));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("E-mail ou senha inválidos.");
        }
    }

    // Cadastro público: sempre cria como "aluno" (admin/professor são criados via /users por um admin)
    @PostMapping("/register")
    public ResponseEntity<Object> register(@RequestBody AuthRequestDto dto) {
        if (userRepository.findByEmail(dto.email()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("E-mail já cadastrado.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(dto, RoleUser.aluno));
    }
}