package com.boardgame.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> {
                    String fieldName = error.getField();
                    String defaultMessage = error.getDefaultMessage();
                    
                    if ("username".equals(fieldName)) {
                        return "Tên tài khoản phải từ 3 đến 50 ký tự.";
                    }
                    if ("email".equals(fieldName)) {
                        return "Địa chỉ email không hợp lệ.";
                    }
                    if ("password".equals(fieldName)) {
                        return "Mật khẩu phải chứa ít nhất 6 ký tự.";
                    }
                    return fieldName + ": " + defaultMessage;
                })
                .collect(Collectors.joining(" "));

        return ResponseEntity.badRequest().body(Map.of("error", errorMessage));
    }
}
