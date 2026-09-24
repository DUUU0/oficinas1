package com.projeto.oficinas_backend.controllers;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.projeto.oficinas_backend.dtos.UserRequestDto;
import com.projeto.oficinas_backend.dtos.UserResponseDto;
import com.projeto.oficinas_backend.models.User;
import com.projeto.oficinas_backend.repositories.UserRepository;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private UserResponseDto toDto(User user) {
        return new UserResponseDto(user.getId(), user.getUsername(), user.getEmail(), user.getTipo());
    }

    @PostMapping
    public ResponseEntity<UserResponseDto> createUser(@RequestBody UserRequestDto dto) {
        User user = new User();
        user.setUsername(dto.username());
        user.setEmail(dto.email());
        user.setSenha(passwordEncoder.encode(dto.password()));
        user.setTipo(dto.tipo());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(userRepository.save(user)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> putUser(@PathVariable Long id, @RequestBody UserRequestDto dto) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuário não existe!");
        }

        User user = userOptional.get();
        user.setUsername(dto.username());
        user.setEmail(dto.email());
        user.setTipo(dto.tipo());
        if (dto.password() != null && !dto.password().isBlank()) {
            user.setSenha(passwordEncoder.encode(dto.password()));
        }

        return ResponseEntity.ok(toDto(userRepository.save(user)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuário não existe!");
        }
        userRepository.delete(userOptional.get());
        return ResponseEntity.ok("Usuário removido com sucesso!");
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok((Object) toDto(user)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuário não encontrado."));
    }

    @GetMapping("/me")
    public ResponseEntity<Object> getAuthenticatedUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return userRepository.findByEmail(userDetails.getUsername())
                .map(user -> ResponseEntity.ok((Object) toDto(user)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }
}