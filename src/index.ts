import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { install } from "./install";
import { watch } from "./watch";
import * as e from 'fp-ts/Either';

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
      const run = install(argv.ci || false);
      run().then(e.fold(err => {

      }, () => {}));
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
