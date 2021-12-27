# @trop/seed

* Define, load and validate JSON configuration file.
* Major version with even number is use for development, for example `0.3.0`,
  `2.1.0`.
* Major version with odd number is use for production, for example `1.0.0`,
  `3.0.1`.

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
 * @param {Options} [options={}]
 * @returns {any} Valid configurations from file.
 * @throws {LoadingError}
 */
function load(schema, file, default_values={}) {}

/**
 * @typedef {object} Options
 * @property {object} [schema={}] - JSON schema that specifies configuration.
 * @property {KeyValue} [defaultValues={}] - Key-value pairs for default
 * of configuration values. The key follows specification of argument "path"
 * from "lodash.set()".
 * @param {uint} [filePermission=0o600] - If file permission is greater than
 * this one then throws error.
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
            country: {
                type: 'string'
            },
            city: {
                type: 'string'
            }
        }
    }
}
let defaultValues = {
    'age': 18,
    'address.country': 'country.foo',
    'address.city': 'country.bar'
}

try {
    let config = seed.load('config_file.json', {
        schema: schema,
        defaultValues: defaultValues,
        filePermission: 0o700
    })
}
catch (error) {
    if (error instanceof seed.LoadingError) {
        console.log(error.summary())
        return
    }

    throw error
}
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
