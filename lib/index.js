'use strict'

const fs = require('fs')
const lodash = require('lodash')
const Ajv = require('ajv')
const comment_json = require('comment-json')

/**
 * Load and verify configuration file.
 * @param {object} schema JSON schema that describes configuration file.
 * @param {string} file Path to JSON configuration file.
 * @param {object} default_values Key-value pairs for default values. The key
 *        follows specification of argument "path" from "lodash.set()".
 * @returns {object} Configurations from file.
 * @throws {ConfigFileError}
 */
function load(schema, file, default_values={}) {
    let config = _load_conf_file(file)

    _verify_config(file, config, schema)
    _set_default_values(config, default_values)

    return config
}

class ConfigFileError extends Error {
    /**
     *
     * @param {string} file Path to invalid configuration file.
     * @param {any} error Error information.
     */
    constructor(file, error) {
        super(file)
        this.name = this.constructor.name
        this.error = error
    }
}

function _load_conf_file(file) {
    let raw = fs.readFileSync(file, 'utf-8')

    try {
        return comment_json.parse(raw)
    }
    catch {
        throw new Error('Invalid JSON format')
    }
}

function _verify_config(file, conf, schema) {
    let ajv = new Ajv()
    let valid = ajv.validate(schema, conf)

    if (!valid) {
        let error = JSON.stringify(ajv.errors, null, 2)
        throw new ConfigFileError(file, error)
    }
}

function _set_default_values(conf, default_values) {
    for (let key of Object.keys(default_values)) {
        _set_default_value(conf, default_values, key)
    }
}

function _set_default_value(conf, default_values, key) {
    let v = lodash.get(conf, key)

    if (v === undefined) {
        lodash.set(conf, key, default_values[key])
    }
}

module.exports = {
    load,
    ConfigFileError
}
