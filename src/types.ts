import { TaskEither } from "fp-ts/lib/TaskEither";

export interface LoutFile {
  dependencies: {
    [path: string]: string;
  };
}

export interface LoutDepSpec {
  path: string;
  url: string;
  hash?: string;
}

export interface LoutDep extends LoutDepSpec {
  contents: string;
}

/**
 * Fetched dependencies
 */
export type LoutDeps = Record<string, string>;

/**
 * Map of dependencies -> hashes
 */
export type LoutDepLock = Record<string, string>;

export interface CopyOptions {
  src: string;
  to: string[];
  watch: boolean;
  noCommit: boolean;
}

export interface Pier {
  port: number;
  desk: string;
}

export class UnknownError extends Error {}
export class NetworkError extends Error {}
export class LockfileError extends Error {}
export class ValidationError extends Error {}
export class FSError extends Error {}

export type LoutError =
  | UnknownError
  | NetworkError
  | LockfileError
  | FSError
  | ValidationError;

export type LoutTask<T> = TaskEither<LoutError, T>;
