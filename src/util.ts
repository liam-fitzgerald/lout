import crypto from "crypto";
import fs from "fs/promises";
import { PathLike } from "fs";
import { tryCatch } from "fp-ts/lib/TaskEither";
import axios, { AxiosError } from "axios";
import {
  FSError,
  LoutError,
  LoutTask,
  NetworkError,
  UnknownError,
} from "./types";
import * as t from "fp-ts/TaskEither";

export function sha(str: string) {
  return crypto.createHash("sha256").update(str).digest("base64");
}

export function fileExists(path: PathLike): LoutTask<boolean> {
  return t.tryCatch(
    async (): Promise<boolean> => {
      try {
        await fs.access(path);
        return true;
      } catch (e) {
        return false;
      }
    },
    () => new UnknownError()
  );
}

function isAxiosError(e: Error): e is AxiosError<any> {
  return "isAxiosError" in e;
}

function axiosErrorToMessage(error: AxiosError<any>) {
  if (error.response) {
    return "Bad response from server";
  }
  if (error.request) {
    return "No response from server";
  }
  return `Unknown Network Error ${error.message}`;
}

export const httpGet = (url: string) =>
  tryCatch<LoutError, string>(
    async () => {
      const { data } = await axios.get(url);
      return data;
    },
    (e: any) => {
      if (e instanceof Error && isAxiosError(e)) {
        return new NetworkError(axiosErrorToMessage(e));
      }
      return new UnknownError(e?.message || e);
    }
  );

export const readFile = (file: PathLike) =>
  tryCatch<LoutError, string>(
    async () => {
      const buf = await fs.readFile(file);
      return buf.toString("utf8");
    },
    () => new FSError(`Failed to read file: ${file}`)
  );

export const writeFile = (file: PathLike, contents: string) =>
  tryCatch<LoutError, void>(
    async () => {
      await fs.writeFile(file, contents);
    },
    () => new FSError(`Failed to write file: ${file}`)
  );

export function parentFolder(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

export function JSONparse<T = any>(json: string): LoutTask<T> {
  return tryCatch(
    async () => {
      return JSON.parse(json);
    },
    () => new UnknownError("unable to parse JSON")
  );
}
