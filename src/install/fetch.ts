import { LoutTask, LoutDepSpec, LoutDep } from "../types";
import { pipe } from "fp-ts/function";
import { httpGet } from "../util";
import * as t from "fp-ts/TaskEither";

const fetchDep = (dep: LoutDepSpec): LoutTask<LoutDep> =>
  pipe(
    httpGet(dep.url),
    t.map((contents: string): LoutDep => ({ ...dep, contents }))
  );

export const getDeps: (deps: readonly LoutDepSpec[]) => LoutTask<readonly LoutDep[]> =
  t.traverseArray(fetchDep);

