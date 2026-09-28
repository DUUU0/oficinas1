package com.projeto.oficinas_backend.services;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.projeto.oficinas_backend.dtos.AuthRequestDto;
import com.projeto.oficinas_backend.dtos.AuthResponseDto;
import com.projeto.oficinas_backend.dtos.UserResponseDto;
import com.projeto.oficinas_backend.models.User;
import com.projeto.oficinas_backend.models.enums.RoleUser;
import com.projeto.oficinas_backend.repositories.UserRepository;
import com.projeto.oficinas_backend.security.JwtService;

@Service
public class AuthService {

    private final UserRepository repository;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final AuthenticationManager authManager;

    public AuthService(UserRepository repository,
                       PasswordEncoder encoder,
                       JwtService jwtService,
                       AuthenticationManager authManager) {
        this.repository = repository;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.authManager = authManager;
    }

    public AuthResponseDto login(AuthRequestDto dto) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.email(), dto.password())
        );

        User user = repository.findByEmail(dto.email())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        String token = jwtService.generateToken(user.getEmail(), user.getTipo().name());

        return new AuthResponseDto(token, user.getTipo(), user.getUsername());
    }

    public UserResponseDto register(AuthRequestDto dto, RoleUser role) {
        User user = new User();
        user.setUsername(dto.username());
        user.setEmail(dto.email());
        user.setSenha(encoder.encode(dto.password()));
        user.setTipo(role);
        user = repository.save(user);

        return new UserResponseDto(user.getId(), user.getUsername(), user.getEmail(), user.getTipo());
    }
}