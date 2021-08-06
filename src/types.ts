export interface LoutFile {
  dependencies: {
    [path: string]: string;
  };
}

/**
 * Fetched dependencies
 */
export interface LoutDeps {
  [path: string]: string;
}

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
