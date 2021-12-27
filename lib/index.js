'use strict'

const fs = require('fs')
const lodash = require('lodash')
const Ajv = require('ajv')
const commentJson = require('comment-json')

class LoadingError extends Error {
    /**
     *
     * @param {string} message
     * @param {string} filePath
     * @param {KeyValue} labels
     */
    constructor(message, filePath, labels={}) {
        super(message)
        this.name = 'LoadingError'
        this.filePath = filePath
        this.labels = labels
    }

    summary() {
        return 'error: load configuration file\n' +
            `message: ${this.message}\n` +
            `filePath: ${this.filePath}\n` +
            this._labelLines()
    }

    _labelLines() {
        return Object.keys(this.labels)
            .map(k => `${k}: ${this.labels[k]}`)
            .join('\n')
    }
}

class InternalLoadingError extends Error {
    constructor(message, labels={}) {
        super(message)
        this.name = 'InternalLoadingError'
        this.labels = labels
    }
}

/**
 * @typedef {object} KeyValue
 */

/**
 * @typedef {object} Options
 * @property {object} [schema={}] - JSON schema that specifies configuration.
 * @property {KeyValue} [defaultValues={}] - Key-value pairs for default
 * of configuration values. The key follows specification of argument "path"
 * from "lodash.set()".
 * @property {uint} [filePermission=0o600] - File must be in mode less than or
 * equal.
 */

/**
 * Load and validate configuration file.
 *
 * @param {string} filePath - Path to JSON configuration file.
 * @param {Options} [options={}]
 * @returns {any} Valid configurations from file.
 * @throws {LoadingError}
 */
function load(filePath, options={}) {
    try {
        _validateFilePath(filePath)

        let validOptions = _formatOptions(options)
        let config = _loadFile(filePath, options.filePermission)

        _validateConfiguration(config, validOptions.schema)
        _setDefaultValues(config, validOptions.defaultValues)

        return config
    }
    catch (error) {
        throw _throwLoadingError(filePath, error)
    }
}

function _validateFilePath(value) {
    if (typeof value !== 'string') {
        throw new InternalLoadingError('invalid file path')
    }
}

/**
 * @param {string} filePath
 * @param {any} error
 * @throws {LoadingError}
 */
function _throwLoadingError(filePath, error) {
    if (!(error instanceof InternalLoadingError)) {
        throw error
    }

    throw new LoadingError(error.message, filePath, error.labels)
}

/**
 *
 * @param {any} options
 * @returns {Options} - Valid options.
 * @throws {InternalLoadingError}
 */
function _formatOptions(options={}) {
    let knownAttributes = ['schema', 'filePermission', 'defaultValues']
    let unknownAttribute = _getUnknowwnAttribute(options, knownAttributes)

    if (unknownAttribute) {
        throw new InternalLoadingError(`unknown option: ${unknownAttribute}`)
    }

    let defaultOptions = {
        schema: {},
        filePermission: 0o600,
        defaultValues: {}
    }
    let result = Object.assign(defaultOptions, options)

    if (typeof result.schema !== 'object') {
        throw new InternalLoadingError('invalid option: schema')
    }

    if (!_isFilePermission(result.filePermission)) {
        throw new InternalLoadingError('invalid option: filePermission')
    }

    if (typeof result.defaultValues !== 'object') {
        throw new InternalLoadingError('invalid option: defaultValues')
    }

    return result
}

/**
 *
 * @param {any} value
 * @param {Array<string>} knownAttributes
 * @returns {string | undefined}
 */
function _getUnknowwnAttribute(value, knownAttributes) {
    let attributes = Object.keys(value)

    for (let attribute of attributes) {
        if (!knownAttributes.includes(attribute)) {
            return attribute
        }
    }

    return undefined
}

/**
 *
 * @param {any} value
 * @returns {boolean}
 */
function _isUint(value) {
    return Number.isInteger(value) && value >= 0
}

/**
 *
 * @param {any} value
 * @returns {boolean}
 */
function _isFilePermission(value) {
    return _isUint(value) && (value <= 0o7777)
}

/**
 *
 * @param {string} filePath - Path to configuration file.
 * @param {uint} filePermission - If file permission is greater than this one
 * then throws error.
 * @returns {any} - Parsed data of configuration file.
 * @throws {BadFileError}
 */
function _loadFile(filePath, filePermission) {
    return _parseFileData(
        _readFile(filePath, filePermission)
    )
}

/**
 *
 * @param {string} filePath - Path to file.
 * @param {uint} filePermission - If file permission is greater than this one
 * then throws error.
 * @returns {string} - File content.
 * @throws {InternalLoadingError}
 */
function _readFile(filePath, filePermission=0o600) {
    try {
        let fileStat = fs.statSync(filePath)

        if (!fileStat.isFile()) {
            throw new InternalLoadingError('not a regular file')
        }

        let actualPermission = fileStat.mode & 0o0777

        if (actualPermission > filePermission) {
            throw new InternalLoadingError(
                'file permission is too open',
                {
                    upperBoundary: _toOctal(filePermission),
                    actual: _toOctal(actualPermission)
                }
            )
        }

        return fs.readFileSync(filePath, 'utf-8')
    }
    catch (error) {
        if (error && error.errno === -2) {
            throw new InternalLoadingError(
                'file is not existed or access denied'
            )
        }

        throw error
    }
}

/**
 *
 * @param {string} data
 * @returns {any}
 * @throws {InternalLoadingError}
 */
function _parseFileData(data) {
    try {
        return commentJson.parse(data)
    }
    catch (error) {
        _throwJsonParsingError(error)
    }
}

/**
 *
 * @param {number} value
 * @returns {string} - Octal string with prefix `0o`.
 */
function _toOctal(value) {
    return '0o' + value.toString(8)
}

/**
 *
 * @param {any} conf
 * @param {JsonSchema} schema
 * @throws {InternalLoadingError}
 */
function _validateConfiguration(conf, schema) {
    try {
        let ajv = new Ajv()
        let valid = ajv.validate(schema, conf)

        if (!valid) {
            _throwBadConfigurationError(ajv.errors)
        }
    }
    catch (error) {
        if (error instanceof Ajv.MissingRefError) {
            _throwBadSchemaError(error)
        }

        throw error
    }
}

function _setDefaultValues(conf, default_values) {
    for (let key of Object.keys(default_values)) {
        _setDefaultValue(conf, default_values, key)
    }
}

function _setDefaultValue(conf, default_values, key) {
    let v = lodash.get(conf, key)

    if (v === undefined) {
        lodash.set(conf, key, default_values[key])
    }
}

/**
 *
 * @param {any} error
 * @throws {InternalLoadingError}
 */
function _throwJsonParsingError(error) {
    if (!_isJsonParsingError(error)) {
        throw new InternalLoadingError('bad throw from json parsing')
    }

    throw new InternalLoadingError(
        'invalid JSON format',
        {
            line: error.line,
            column: error.column
        }
    )
}

function _isJsonParsingError(error) {
    return error instanceof SyntaxError &&
        _isUint(error.line) &&
        _isUint(error.column)
}

/**
 * @param {Array<Ajv.ValidationError>} errors
 * @throws {BadConfigurationError}
 */
function _throwBadConfigurationError(errors) {
    if (
        !Array.isArray(errors) ||
        errors.length <= 0 ||
        !_isAjvValidationError(errors[0])
    ) {
        throw new Error('invalid ajv validation errors')
    }

    let {
        dataPath,
        schemaPath,
        message
    } = errors[0]

    throw new InternalLoadingError(
        'bad configuration',
        {dataPath, schemaPath, message}
    )
}

/**
 *
 * @param {Ajv.MissingRefError} error
 * @throws {BadSchemaError}
 */
function _throwBadSchemaError(error) {
    if (!_isAjvMissingReferenceError) {
        throw new Error('invalid ajv missing reference error')
    }

    let {missingRef, missingSchema, message} = error

    throw new InternalLoadingError(
        'bad schema specification',
        {
            reference: missingRef,
            schema: missingSchema,
            message: message
        }
    )
}

/**
 *
 * @param {any} error
 * @returns {boolean}
 */
function _isAjvValidationError(error) {
    return error !== undefined &&
        typeof error.dataPath === 'string' &&
        _isNonEmptyString(error.schemaPath) &&
        _isNonEmptyString(error.message)
}

/**
 *
 * @param {any} error
 * @returns {boolean}
 */
function _isAjvMissingReferenceError(error) {
    return error !== undefined &&
        _isNonEmptyString(error.missingRef) &&
        _isNonEmptyString(error.missingSchema) &&
        _isNonEmptyString(error.message)
}

/**
 *
 * @param {any} value
 * @returns {boolean}
 */
function _isNonEmptyString(value) {
    return (typeof value === 'string') && (value.length > 0)
}

module.exports = {
    load,
    LoadingError,
    _formatOptions,
    _loadFile
}
