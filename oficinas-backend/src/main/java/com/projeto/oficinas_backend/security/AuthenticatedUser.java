package com.projeto.oficinas_backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.projeto.oficinas_backend.models.User;
import com.projeto.oficinas_backend.repositories.UserRepository;

@Component
public class AuthenticatedUser {

    private final UserRepository userRepository;

    public AuthenticatedUser(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("Nenhum usuário autenticado na requisição atual.");
        }
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Usuário autenticado não encontrado: " + email));
    }

    public Long getUsuarioLogadoId() {
        return getUsuarioLogado().getId();
    }
}