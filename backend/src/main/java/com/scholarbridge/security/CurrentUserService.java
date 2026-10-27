package com.scholarbridge.security;

import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
    public User requireUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new BusinessRuleException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
        }
        return user;
    }

    public User requireRole(UserRole role) {
        User user = requireUser();
        if (user.getRole() != role) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "Your account does not have access to this action.");
        }
        return user;
    }
}