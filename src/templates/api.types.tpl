export type HttpStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

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
  400: { message: string };
  401: { message: string };
  403: { message: string };
  404: { message: string };
  409: { message: string };
  500: { message: string };
};