package com.boardgame.security;

import com.boardgame.service.*;

import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (!StringUtils.hasText(header) || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        if (!jwtService.isTokenValid(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            var userId = jwtService.extractUserId(token);
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                filterChain.doFilter(request, response);
                return;
            }

            UserDetails userDetails = User.builder()
                    .username(user.getId().toString())
                    .password("")
                    .authorities(Collections.emptyList())
                    .build();

            var auth = new UsernamePasswordAuthenticationToken(
                    user, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (Exception ignored) {}

        filterChain.doFilter(request, response);
    }
}
