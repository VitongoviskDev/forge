export type TPagination<TData> = {
  current_page: number;
  data: TData[];
  next_page_url?: string;
  path: string;
  per_page: number;
  prev_page_url?: string;
  to: number;
  total: number;
  last_page: number;
};

export type TFieldValidationError<TField extends string> = {
  field: TField;
  error: string;
};