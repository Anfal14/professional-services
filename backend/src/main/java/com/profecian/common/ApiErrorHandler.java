package com.profecian.common;

import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Every error response is `{ "message": "..." }`; the HTTP client turns it into an ApiError. */
@RestControllerAdvice
public class ApiErrorHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);

  public record ErrorBody(String message) {}

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ErrorBody> api(ApiException e) {
    return ResponseEntity.status(e.status()).body(new ErrorBody(e.getMessage()));
  }

  @ExceptionHandler(OptimisticLockingFailureException.class)
  ResponseEntity<ErrorBody> stale(OptimisticLockingFailureException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorBody("This booking was just updated by someone else — please try again"));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ErrorBody> invalid(MethodArgumentNotValidException e) {
    var first = e.getBindingResult().getFieldErrors().stream().findFirst();
    String message = first.map(f -> f.getField() + ": " + f.getDefaultMessage()).orElse("Invalid request");
    return ResponseEntity.badRequest().body(new ErrorBody(message));
  }

  @ExceptionHandler({ConstraintViolationException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
  ResponseEntity<ErrorBody> unreadable(Exception e) {
    return ResponseEntity.badRequest().body(new ErrorBody("Invalid request"));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ErrorBody> denied(AccessDeniedException e) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorBody("You don't have access to this action"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, String>> unexpected(Exception e) {
    log.error("Unhandled error", e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Something went wrong"));
  }
}
