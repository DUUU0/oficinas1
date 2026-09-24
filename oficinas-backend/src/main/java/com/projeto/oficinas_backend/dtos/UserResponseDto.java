package com.projeto.oficinas_backend.dtos;

import com.projeto.oficinas_backend.models.enums.RoleUser;

public record UserResponseDto(Long id, String username, String email, RoleUser tipo) {
}