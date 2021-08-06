import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { install } from "./install";
import { watch } from "./watch";

const config = yargs(hideBin(process.argv))
  .command(
    "install",
    "Install dependencies",
    (yargs) =>
      yargs.option("ci", {
        type: "boolean",
        description: "Fail on lockfile change",
      }),
    (argv) => {
      install(argv.ci)
        .then(() => {
          process.exit(0);
        })
        .catch((err) => {
          console.error(err.message);
          process.exit(1);
        });
    }
  )
  .command(
    "copy [piers...]",
    "Copy app files into piers",
    (yargs) =>
      yargs
        .positional("piers", {
          describe: "Desks to copy the app files into",
        })
        .boolean(["watch", "no-commit"])
        .option("watch", {
          alias: "w",
          default: false,
          description: "Watch files for changes",
        })
        .option("no-commit", {
          alias: "n",
          default: false,
          description: "Watch files for changes",
        }),
    (argv) => {
      watch({
        to: argv.piers as string[],
        src: "urbit",
        watch: argv.watch,
        noCommit: argv["no-commit"],
      });
    }
  ).argv;
