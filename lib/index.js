const fs = require('fs')
const js_yaml = require('js-yaml')
const lodash = require('lodash')
const Ajv = require('ajv')

// Description
// * Throw on configuration file is invalid than schema
class InvalidConfigFile extends Error {
    // Input
    // * file / String - Path to invalid configuration file.
    // * error / any - Error information
    constructor(file, error) {
        super(file)
        this.name = this.constructor.name
        this.error = error
    }
}

// Description
// * Load and verify configuration file
//
// Input
// * schema / Object - JSON schema which describe configurations
// * file / String - Path to configuration file which follow YAML syntax
// * default / Object - Key-value pairs for default values. See argument path
//   from lodash.set() for more information
//
// Output
// * Object - Configurations
//
// Exception
// * InvalidConfigFile - Configuration file does not follows schema
// * and other errors
function load(schema, file, defaultValues={}) {
    let rawConf = _load_conf_file(file)

    _verify_raw_conf(file, rawConf, schema)
    _set_default_values(rawConf, schema, defaultValues)
    return rawConf
}

module.exports = {
    load,
    InvalidConfigFile
}

// private members

function _load_conf_file(file) {
    let raw = fs.readFileSync(file)
    let conf = js_yaml.safeLoad(raw)

    return conf
}

function _verify_raw_conf(file, conf, schema) {
    let ajv = new Ajv()
    let valid = ajv.validate(schema, conf)

    if (!valid) {
        let error = JSON.stringify(ajv.errors, null, 2)
        throw new InvalidConfigFile(file, error)
    }
}

function _set_default_values(conf, schema, defaultValues) {
    for (let key of Object.keys(defaultValues)) {
        _set_default_value(conf, schema, defaultValues, key)
    }
}

function _set_default_value(conf, schema, defaultValues, key) {
    let v = lodash.get(conf, key)

    if (v === undefined) {
        lodash.set(conf, key, defaultValues[key])
    }
}
