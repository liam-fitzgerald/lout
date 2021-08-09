import { LockfileError, LoutDep, LoutDepSpec, LoutTask } from "../types";
import * as t from "fp-ts/lib/TaskEither";
import path from "path";
import _ from "lodash";
import { pipe } from "fp-ts/lib/function";
import * as a from "fp-ts/lib/ReadonlyArray";
import { fileExists, JSONparse, readFile, sha, writeFile } from "../util";

const lockLocation = path.resolve(process.cwd(), "./lout.lock.json");

const genLockfile = (deps: readonly LoutDep[]): Record<string, string> =>
  _.reduce(
    deps,
    (acc, { path, contents }) => {
      return { ...acc, [path]: sha(contents) };
    },
    {}
  );

const writeLockfile = (ci: boolean) => (deps: readonly LoutDep[]) =>
  pipe(
    genLockfile(deps),
    JSON.stringify.bind(JSON),
    (file) => writeFile(lockLocation, file),
    t.map(() => deps)
  );

export const handleLockfile: (
  ci: boolean
) => (deps: readonly LoutDep[]) => LoutTask<readonly LoutDep[]> =
  (ci) => (deps) =>
    pipe(
      readLockfile,
      t.map(lockDeps(deps)),
      t.chain(validateHashes(ci)),
      t.chain(writeLockfile(ci))
    );

const lockDeps =
  (deps: readonly LoutDep[]) =>
  (lockfile: Record<string, string> | null): readonly LoutDep[] => {
    if (!lockfile) {
      return deps;
    }
    const pairs = _.toPairs(lockfile);
    return _.reduce(
      pairs,
      (acc, [path, hash]) => {
        const index = acc.findIndex(({ path: depPath }) => path === depPath);
        if (index >= 0) {
          return [
            ...acc.slice(0, index),
            { ...acc[index], hash },
            ...acc.slice(index + 1),
          ];
        }
        return acc;
      },
      deps
    );
  };

const checkHash = (dep: LoutDep) => {
  if (!dep?.hash) {
    return false;
  }
  if (dep.hash !== sha(dep.contents)) {
    return true;
  }
  return false;
};

const validateHashes =
  (ci: boolean) =>
  (deps: readonly LoutDep[]): LoutTask<readonly LoutDep[]> => {
    if (!ci) {
      return t.right(deps);
    }
    const failed = pipe(deps, a.filter(checkHash));
    if (failed.length > 0) {
      return t.left(new LockfileError("Hashes do not match"));
    }
    return t.right(deps);
  };

const parseLockfile = (file: string | null) =>
  file ? JSONparse<Record<string, string>>(file) : t.right(null);

const readLockfile = pipe(
  fileExists(lockLocation),
  t.chain((exists) => {
    if (!exists) {
      return t.right(null);
    }
    return readFile(lockLocation);
  }),
  t.chain(parseLockfile)
);
