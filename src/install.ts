import path from "path";
import fs from "fs/promises";
import schema from "./lout.schema.json";
import { LoutFile, LoutDeps } from "./types";
import Ajv from "ajv";
const ajv = new Ajv();
import _ from "lodash";

import f from "lodash/fp";
import axios from "axios";
import { PathLike } from "fs";

const location = path.resolve(process.cwd(), "./lout.json");
const validate = ajv.compile<LoutFile>(schema);

const getDeps: (deps: LoutDeps) => Promise<LoutDeps> = f.flow(
  f.toPairs,
  f.map(async ([path, url]): Promise<[string, string]> => {
    const { data } = await axios.get(url);
    console.log(url);
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

export async function install() {
  const file = JSON.parse((await fs.readFile(location)).toString("utf8"));
  if (validate(file)) {
    try {
      console.log(file.dependencies);
      const deps = await getDeps(file.dependencies);
      await constructVendorTree(deps);
      console.log("Finished installing");
    } catch (e) {
      console.log("a");
      console.error(e);
      throw new Error("Unable to fetch dependencies");
    }
  } else {
    throw new Error("Bad lout.json file format");
  }
}
