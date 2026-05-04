export type HttpStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

export interface BaseError {
  message: string;
}

export interface UnauthorizedError extends BaseError {}
export interface ForbiddenError extends BaseError {}
export interface NotFoundError extends BaseError {}

export type ApiError<
  TMap extends Partial<Record<HttpStatus, any>>
> = {
  [K in keyof TMap & HttpStatus]: {
    status: K;
    message: string;
    error_data: TMap[K];
  };
}[keyof TMap & HttpStatus];

export type DefaultErrorMap = {
  400: BaseError;
  401: UnauthorizedError;
  403: ForbiddenError;
  404: NotFoundError;
  409: BaseError;
  422: BaseError;
  500: BaseError;
};