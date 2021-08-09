import { LockfileError, LoutDep, LoutDepSpec, LoutTask } from "../types";
import * as t from "fp-ts/lib/TaskEither";
import path from "path";
import _ from "lodash";
import { pipe } from "fp-ts/lib/function";
import * as a from "fp-ts/lib/ReadonlyArray";
import { fileExists, JSONparse, readFile, sha, writeFile } from "../util";
import chalk from "chalk";

const lockLocation = path.resolve(process.cwd(), "./lout.lock.json");

const genLockfile = (deps: readonly LoutDep[]): Record<string, string> =>
  _.reduce(
    deps,
    (acc, { path, contents }) => {
      return { ...acc, [path]: sha(contents) };
    },
    {}
  );

const writeLockfile = (ci: boolean) => (lockfile: Record<string, string>) =>
  pipe(lockfile, JSON.stringify.bind(JSON), (file) =>
    writeFile(lockLocation, file)
  );

export const handleLockfile: (
  ci: boolean
) => (deps: readonly LoutDep[]) => LoutTask<readonly LoutDep[]> =
  (ci) => (deps) =>
    pipe(
      readLockfile,
      t.chain(lockDeps(ci, deps)),
      t.chain(writeLockfile(ci)),
      t.map(() => deps)
    );

const lockDeps =
  (ci: boolean, deps: readonly LoutDep[]) =>
  (
    lockfile: Record<string, string> | null
  ): LoutTask<Record<string, string>> => {
    const newLockfile = genLockfile(deps);
    if (!_.isEqual(lockfile, newLockfile)) {
      if(ci) {
        return t.left(new LockfileError("Lockfile does not match"));
      }
      console.log(chalk`{yellow Updating lockfile...}`)
    }
    return t.right(newLockfile);
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
