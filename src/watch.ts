import _ from "lodash/fp";
import chokidar from "chokidar";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { CopyOptions, Pier } from "./types";
const log = console.log.bind(console);

async function copyFile(src: string, to: string[]) {
  const arvoSrc = src.split("/").slice(1).join("/");
  const toAbs = to.map((t) => path.resolve(process.cwd(), `${t}/${arvoSrc}`));
  const fromPath = path.resolve(process.cwd(), src);
  await Promise.all(
    toAbs.map(async (t) => {
      const folderPath = t.split("/").slice(0, -1).join("/");
      await fs.mkdir(folderPath, { recursive: true });
      await fs.copyFile(fromPath, t);
    })
  );
}

export async function watch(options: CopyOptions) {
  const { src, to } = options;
  let ready = false;
  const piers: Pier[] = _.compact(
    await Promise.all(
      to.map(async (desk: string) => {
        const deskComponents = desk.split("/");
        const deskName = [...deskComponents].reverse()[0];
        const pier = path.resolve(
          process.cwd(),
          deskComponents.slice(0, -1).join("/")
        );
        try {
          const portFile = await fs.readFile(`${pier}/.http.ports`);
          const port = portFile
            .toString("utf8")
            .split("\n")
            .find((line) => line.includes("loopback"))
            ?.split(/\s/)?.[0];
          if (!port) {
            return null;
          }
          return { port: parseInt(port, 10), desk: deskName };
        } catch (e) {
          console.error(e);
          return null;
        }
      })
    )
  );

  const commit = async () => {
    if (options?.noCommit || !ready) {
      return;
    }
    await Promise.all(
      piers.map(({ port, desk }) => {
        const payload = {
          sink: {
            app: "hood",
          },
          source: {
            dojo: `+hood/commit %${desk}`,
          },
        };
        return axios.post(`http://localhost:${port}`, payload, {});
      })
    );
  };
  const paths = ["vendor", src];
  const watcher = chokidar.watch(paths, {
    persistent: options.watch,
  });
  watcher.on("add", async (path) => {
    log(`Added: ${path}`);
    await copyFile(path, to);
    await commit();
  });
  watcher.on("change", async (path) => {
    log(`Change: ${path}`);
    await copyFile(path, to);
    await commit();
  });
  watcher.on("unlink", (path) => {
    log(`Removed: ${path}`);
  });

  watcher.on("ready", async () => {
    ready = true;
    await commit();
    if (!options.watch) {
      process.exit(0);
    }
  });
}
