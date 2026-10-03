package com.profecian.common;

import org.springframework.http.HttpStatus;

/**
 * A business-rule failure whose message is safe to show to the user. The apps
 * surface `message` verbatim, so texts match packages/shared/src/mock.ts exactly.
 */
public class ApiException extends RuntimeException {
  private final HttpStatus status;

  public ApiException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public HttpStatus status() {
    return status;
  }

  public static ApiException bad(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, message);
  }

  public static ApiException notFound(String message) {
    return new ApiException(HttpStatus.NOT_FOUND, message);
  }

  public static ApiException forbidden(String message) {
    return new ApiException(HttpStatus.FORBIDDEN, message);
  }

  public static ApiException conflict(String message) {
    return new ApiException(HttpStatus.CONFLICT, message);
  }

  public static ApiException unauthorized(String message) {
    return new ApiException(HttpStatus.UNAUTHORIZED, message);
  }

  public static ApiException tooMany(String message) {
    return new ApiException(HttpStatus.TOO_MANY_REQUESTS, message);
  }
}
