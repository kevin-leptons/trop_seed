# @trop/seed

* Define, load and validate JSON configuration file.
* Development version has even number, for example `0.3.0`, `2.1.0`.
* Production version has odd major version, for example `1.0.0`, `3.0.1`.

# Install

```bash
npm install @trop/seed
```

# APIs

```js
const {load, LoadingError} = require('@trop/seed')

/**
 * Load and validate configuration file.
 *
 * @param {string} filePath - Path to JSON configuration file.
 * @param {Options} [options={}] - Options for loading.
 * @returns {any} Valid configuration from file.
 * @throws {LoadingError}
 */
function load(schema, file, default_values={}) {}

/**
 * @typedef {object} Options
 * @property {object} [schema={}] - JSON schema that specifies configuration.
 * @property {object} [defaultValues={}] - Key-value pairs for default values,
 * it is the same as argument `path` from `lodash.set()`.
 * @param {FilePermission} [filePermission=0o0600] - If file permission is
 * greater than this one then throws error. Works on Linux and MacOS, ignored
 * on on other platforms
 */

/**
 * @typdef {number} FilePermission
 *
 * Unsigned integer, less than or equal 0o7777.
 */

/**
 * @typedef {Error} LoadingError
 * @property {string} message - Short description.
 * @property {any} filePath - Path to configuration file.
 * @property {object} labels - Additional information.
 */
```

# Example

**read_config.js**

```js
const seed = require('@trop/seed')

let schema = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'age'],
    properties: {
        name: {
            type: 'string'
        },
        age: {
            type: 'integer',
            minimum: 0
        },
        address: {
            type: 'object',
            properties: {
                country: {
                    type: 'string'
                },
                city: {
                    type: 'string'
                }
            }
        }
    }
}
let defaultValues = {
    'age': 18,
    'address.country': 'country.foo',
    'address.city': 'country.bar'
}
let config = seed.load('config_file.json', {
    schema: schema,
    defaultValues: defaultValues,
    filePermission: 0o700
})

console.log(config)
```

**config_file.json**

```jsonc
// This comment is not standard JSON but does not cause errors.
// Below configuration is parse as normal.

{
    "name": "foo",
    "age": 18,
    "address": {
        "country": "country.foo",
        "city": "city.bar"
    }
}
```

# References

* [Contribution](contribution.md)
* [Changelog](changelog.md)
