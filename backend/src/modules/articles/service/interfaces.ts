export interface ILogger {
  info(obj: Record<string, unknown> | object, msg?: string): void;
  error(obj: Record<string, unknown> | object, msg?: string): void;
  debug(obj: Record<string, unknown> | object, msg?: string): void;
  warn(obj: Record<string, unknown> | object, msg?: string): void;
}

export interface IClock {
  now(): Date;
}
