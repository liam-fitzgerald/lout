import path from "path";
import fs from "fs/promises";
import schema from "../lout.schema.json";
import {
  LoutFile,
  LoutDeps,
  LoutDep,
  LoutDepSpec,
  LoutTask,
  FSError,
  ValidationError,
  LoutError,
} from "../types";
import Ajv from "ajv";
const ajv = new Ajv();
import _ from "lodash";

import f from "lodash/fp";
import * as t from "fp-ts/TaskEither";
import * as e from "fp-ts/Either";
import { pipe, flow } from "fp-ts/function";
import { log, parentFolder, readFile } from "../util";
import { Either } from "fp-ts/lib/Either";
import { getDeps } from "./fetch";
import { handleLockfile } from "./lock";
import chalk from "chalk";

const location = path.resolve(process.cwd(), "./lout.json");
const validate = ajv.compile<LoutFile>(schema);

const fileToDepSpecs: (file: LoutFile) => LoutDepSpec[] = f.flow(
  (f) => f.dependencies,
  f.toPairs,
  f.map(([path, url]: [string, string]) => ({ path, url }))
);

const sortDepByDepth = (a: LoutDepSpec, b: LoutDepSpec) => {
  return b.url.split("/").length - a.url.split("/").length;
};
export const makeVendorPath = (pax: string) =>
  path.resolve(process.cwd(), `vendor/${pax}`);

const writeVendorFile = (dep: LoutDep): LoutTask<LoutDep> =>
  t.tryCatch(
    async () => {
      const { path, url, contents } = dep;
      const folderPath = makeVendorPath(parentFolder(path));

      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(makeVendorPath(path), contents);
      return dep;
    },
    (e) => new FSError(`Failed to write dependency: ${dep.path}`)
  );

const constructVendorTree = (deps: readonly LoutDep[]) =>
  pipe([...deps].sort(sortDepByDepth), t.traverseArray(writeVendorFile));

const validatePackageFile = (file: any): Either<LoutError, LoutFile> => {
  if (validate(file)) {
    return e.right(file);
  }
  return e.left(new ValidationError("Failed to validate lout.json"));
};

const readPackages = f.flow(
  readFile,
  t.map(JSON.parse.bind(JSON)),
  t.chainEitherK(validatePackageFile)
)(location);

export const install = (ci: boolean): LoutTask<any> =>
  pipe(
    readPackages,
    t.map(fileToDepSpecs),
    t.map(log((deps) => `Installing ${deps.length} files...`)),
    t.chain(getDeps),
    t.map(log(`Finished fetching dependencies...`)),
    t.chain(handleLockfile(ci)),
    t.chain(constructVendorTree),
  );
