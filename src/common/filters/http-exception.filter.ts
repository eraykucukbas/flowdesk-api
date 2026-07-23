import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let validationErrors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        detail = (res.message as string) ?? detail;

        // Validation errors from ValidationPipe come as string[]
        if (Array.isArray(res.message)) {
          detail = 'Validation failed';
          validationErrors = res.message as string[];
        }
      }

      title = this.getTitle(status);
    }

    const body: Record<string, unknown> = {
      title,
      status,
      detail,
      instance: request.url,
    };

    if (validationErrors) {
      body.errors = validationErrors;
    }

    response.status(status).json(body);
  }

  private getTitle(status: number): string {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return titles[status] ?? 'Error';
  }
}
