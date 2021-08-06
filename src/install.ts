import path from "path";
import fs from "fs/promises";
import schema from "./lout.schema.json";
import { LoutFile, LoutDeps } from "./types";
import Ajv from "ajv";
const ajv = new Ajv();
import _ from "lodash";
import crypto from "crypto";

import f from "lodash/fp";
import axios from "axios";
import { PathLike } from "fs";

const location = path.resolve(process.cwd(), "./lout.json");
const lockLocation = path.resolve(process.cwd(), "./lout.lock.json");
const validate = ajv.compile<LoutFile>(schema);

const getDeps: (deps: LoutDeps) => Promise<LoutDeps> = f.flow(
  f.toPairs,
  f.map(async ([path, url]): Promise<[string, string]> => {
    const { data } = await axios.get(url);
    return [path, data];
  }),
  (x) => Promise.all<[string, string]>(x),
  async (x) => f.fromPairs(await x)
);

const sortDepByDepth = (a: [string, string], b: [string, string]) => {
  return b[0].split("/").length - a[0].split("/").length;
};
export const makeVendorPath = (pax: string) =>
  path.resolve(process.cwd(), `vendor/${pax}`);

const constructVendorTree = async (deps: LoutDeps) => {
  const pairs = _.toPairs(deps).sort(sortDepByDepth);
  for (let pair of pairs) {
    const [filePath, file] = pair;
    const folderPath = makeVendorPath(
      filePath.split("/").slice(0, -1).join("/")
    );

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(makeVendorPath(filePath), file);
  }
};

async function fileExists(path: PathLike) {
  try {
    await fs.access(path);
    return true;
  } catch (e) {
    return false;
  }
}

async function getLockfile(): Promise<null | { [url: string]: string }> {
  if (!(await fileExists(lockLocation))) {
    console.log("No lockfile, generating a fresh one");
    return null;
  }
  return JSON.parse((await fs.readFile(lockLocation)).toString("utf8"));
}

function hashString(str: string) {
  return crypto.createHash("sha256").update(str).digest("base64");
}

function generateLockfile(deps: LoutDeps) {
  return _.mapValues(deps, hashString);
}

export async function install(ci = false) {
  const file = JSON.parse((await fs.readFile(location)).toString("utf8"));
  if (validate(file)) {
    try {
      const deps = await getDeps(file.dependencies);
      const lockfile = await getLockfile();
      const newLockfile = generateLockfile(deps);
      if (ci && !_.isEqual(lockfile, newLockfile)) {
        throw new Error("Aborting, bad lockfile");
      }
      await fs.writeFile(lockLocation, JSON.stringify(newLockfile));
      await constructVendorTree(deps);
    } catch (e) {
      console.error(e);
      throw e;
    }
  } else {
    throw new Error("Bad lout.json file format");
  }
}
