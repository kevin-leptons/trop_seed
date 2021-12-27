# Changelog

## 2.3.0

* Change: `ConfigFileError` attributes.
* Change: Upgrade ajv to version 8.8.2.
* Add: Validate argument `filePath` from `load()`.

## 2.2.0

* Remove: `ConfigFileError`, use `LoadingError` instead.
* Change: Arguments from `load()`.
* Add: `load()` support to specify file permission requirements.
* Add: `LoadingError` for better error handling from `load()`.

## 2.1.0

* Add: Support comments in JSON configuration file.

## 2.0.0

* Fix: `seed.load()` throws error on empty file and schema does not require
  any properties.
* Change: `seed.load()` accepts JSON instead of YAML file.
* Change: Rename class `InvalidConfigFile` to `ConfigFileError`.
* Change: Write document by JSDoc format.
* Improve: Unit tests.

## v0.2.0

* Change: `seed.load()` interface, support to set default values

## v0.1.0

* Add: API `seed.load()`
