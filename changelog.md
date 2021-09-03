# Changelog

## v0.3.0

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
