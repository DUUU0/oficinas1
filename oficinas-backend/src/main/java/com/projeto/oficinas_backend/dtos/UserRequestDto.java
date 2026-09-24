package com.projeto.oficinas_backend.dtos;

import com.projeto.oficinas_backend.models.enums.RoleUser;

public record UserRequestDto(String username, String email, String password, RoleUser tipo) {
}