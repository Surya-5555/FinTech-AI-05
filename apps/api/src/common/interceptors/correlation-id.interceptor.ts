import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    let correlationId = req.headers['x-correlation-id'];
    
    // Validate or generate
    if (!correlationId || typeof correlationId !== 'string' || correlationId.length > 50) {
      correlationId = randomUUID();
      req.headers['x-correlation-id'] = correlationId;
    }

    res.setHeader('x-correlation-id', correlationId);

    return next.handle();
  }
}
