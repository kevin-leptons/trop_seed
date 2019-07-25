# @trop/seed

Define, load and verify configuration file. It is simple but useful, save you from
design configuration for application.

## Tutorial

```js
const seed = require('@trop/seed')

let schema = {
    type: 'object',
    properties: {
        name: {
            type: 'string'
        },
        age: {
            type: 'integer',
            minimum: 0
        }
    }
}
let conf = seed.load(schema, 'conf_file.yaml')
```

## APIs

### seed.load(schema, file)

* Input
    * `schema` / `Object` - JSON Schema which describes configurations
    * `file`/ `String` - Path to configuration file, written by YAML syntax
* Process
    * Load and parse configurations from file
    * Verify configurations by schema
* Output
    * `Object` - Configurations
* Exception
    * `seed.InvalidConfigFile` - Configuration is invalid
    * and other errors

## Todo

* `seed.load()` does not set default value for attributes because it is quite
  complex. If any one has resources then let's research and make a pull
  request, I am glad to merge it.

## References

* [Contribution](contribution.md)
* [Changelog](changelog.md)
