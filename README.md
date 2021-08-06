# Lout
Lout is a tool to prevent duplication of dependencies between urbit desks. 

## Installation
```
npm i -g lout
```


## Dependencies
```json
{
  "version": 1,
  "dependencies": {
    "mar/bill.hoon": "https://raw.githubusercontent.com/urbit/urbit/4fe10a86701a2038e868ce1237fafb9dc032ecf0/pkg/arvo/mar/bill.hoon",
    "mar/kelvin.hoon": "https://raw.githubusercontent.com/urbit/urbit/4fe10a86701a2038e868ce1237fafb9dc032ecf0/pkg/arvo/mar/kelvin.hoon",
    "mar/noun.hoon": "https://raw.githubusercontent.com/urbit/urbit/4fe10a86701a2038e868ce1237fafb9dc032ecf0/pkg/arvo/mar/noun.hoon",
    "sur/bill.hoon": "https://raw.githubusercontent.com/urbit/urbit/4fe10a86701a2038e868ce1237fafb9dc032ecf0/pkg/arvo/sur/bill.hoon"
  }
}
```

This is an example of `lout.json` file, which defines the dependencies for a package. 
The dependencies property is a map from a arvo path to a URL where the corresponding hoon file can be found.


## Usage

To install vendored files that have been defined in `lout.json`, run

```
lout install
```

This command optionally takes a `--ci` flag that will fail the install if the lockfile changes. It installs the vendored files to `./vendor`

To copy source, run 

```
lout copy ../zod/desk
```

This copies the source under `./urbit` and the vendored files under `./vendor` to the specified location. If the location is an urbit desk, then the files will be automatically committed. This optionally takes a `--watch` flag that will continue to watch for changes and copy affected files.
