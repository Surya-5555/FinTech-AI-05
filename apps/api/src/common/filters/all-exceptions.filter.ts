import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { PolicyViolationError, InvalidStateTransitionError, InvalidIdempotencyInputError } from '@rr/domain';
import { ConcurrencyConflictError } from '@rr/persistence';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp: any = exception.getResponse();
      
      if (status === HttpStatus.BAD_REQUEST && Array.isArray(resp.message)) {
        code = 'VALIDATION_ERROR';
        message = 'Request validation failed';
        details = resp.message;
      } else if (status === HttpStatus.NOT_FOUND) {
        code = 'NOT_FOUND';
        message = resp.message || 'Resource not found';
      } else {
        code = `HTTP_${status}`;
        message = resp.message || exception.message;
      }
    } else if (exception instanceof PolicyViolationError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      code = 'POLICY_VIOLATION';
      message = exception.message;
    } else if (exception instanceof InvalidStateTransitionError) {
      status = HttpStatus.CONFLICT;
      code = 'INVALID_STATE_TRANSITION';
      message = exception.message;
    } else if (exception instanceof ConcurrencyConflictError) {
      status = HttpStatus.CONFLICT;
      code = 'CONCURRENCY_CONFLICT';
      message = 'The resource was modified by another request. Please retry.';
    } else if (exception instanceof InvalidIdempotencyInputError) {
      status = HttpStatus.CONFLICT;
      code = 'IDEMPOTENCY_CONFLICT';
      message = exception.message;
    }

    const correlationId = request.headers['x-correlation-id'] || 'unknown';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ err: exception, correlationId, url: request.url }, 'Unhandled Exception');
    } else {
      this.logger.warn({ err: exception, correlationId, url: request.url }, 'Handled Exception');
    }

    const errorResponse = {
      error: {
        code: code,
        message: Array.isArray(message) ? message[0] : message,
        correlationId,
        details: Array.isArray(message) && message.length > 1 ? message.slice(1) : (status === HttpStatus.INTERNAL_SERVER_ERROR ? [exception instanceof Error ? exception.stack : String(exception)] : []),
      }
    };

    response.status(status).json(errorResponse);
  }
}
