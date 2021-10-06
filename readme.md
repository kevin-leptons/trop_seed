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
const {load, ConfigFileError} = require('@trop/seed')

/**
 * Load and verify configuration file.
 * @param {object} schema JSON schema that describes configuration file.
 * @param {string} file Path to JSON configuration file.
 * @param {object} default_values Key-value pairs for default values. The key
 *        follows specification of argument "path" from "lodash.set()".
 * @returns {object} Configurations from file.
 * @throws {ConfigFileError}
 */
function load(schema, file, default_values={}) {}
```

# Example

**read_config.js**

```js
const seed = require('@trop/seed')

let schema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'name',
        'age'
    ],
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
let default_values = {
    'age': 18,
    'address.country': 'Vietnam',
    'address.city': 'Ha Noi'
}
let config = seed.load(schema, 'config_file.json', default_values)
```

**config_file.json**

```jsonc
// this comment is not standard JSON but will not throw error
// below configuration is parse as normal

{
    "name": "kevin",
    "age": 18,
    "gender": "male",
    "address": {
        "country": "Vietnam",
        "city": "Ha Noi"
    }
}
```

# References

* [Contribution](contribution.md)
* [Changelog](changelog.md)
