package com.projeto.oficinas_backend.dtos;

import com.projeto.oficinas_backend.models.enums.RoleUser;

public record AuthResponseDto(String token, RoleUser tipo) {
}