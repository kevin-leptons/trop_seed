'use strict'

const fs = require('fs')
const lodash = require('lodash')
const Ajv = require('ajv')
const ajvFormats = require('ajv-formats')
const commentJson = require('comment-json')

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
 * Report error to outside of this package.
 */
class LoadingError extends Error {
    /**
     *
     * @property {string} message - Short description.
     * @property {any} filePath - Path to configuration file.
     * @property {object} labels - Additional information.
     */
    constructor(message, filePath, labels={}) {
        super(message)
        this.name = 'LoadingError'
        this.filePath = filePath
        this.labels = labels
    }
}

/**
 * Throw error inside of this package.
 */
class InternalLoadingError extends Error {
    /**
     *
     * @param {string} message
     * @param {object} labels
     */
    constructor(message, labels={}) {
        super(message)
        this.name = 'InternalLoadingError'
        this.labels = labels
    }
}

/**
 * Load and validate configuration file.
 *
 * @param {string} filePath - Path to JSON configuration file.
 * @param {Options} [options={}] - Options for loading.
 * @returns {any} Valid configuration from file.
 * @throws {LoadingError}
 */
function load(filePath, options={}) {
    try {
        validateFilePath(filePath)

        let validOptions = formatOptions(options)
        let config = loadFile(filePath, options.filePermission)

        validateConfiguration(config, validOptions.schema)
        setDefaultValues(config, validOptions.defaultValues)

        return config
    }
    catch (error) {
        throw throwLoadingError(filePath, error)
    }
}

function validateFilePath(value) {
    if (typeof value !== 'string') {
        throw new InternalLoadingError('invalid file path')
    }
}

/**
 * @param {string} filePath
 * @param {any} error
 * @throws {LoadingError}
 */
function throwLoadingError(filePath, error) {
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
function formatOptions(options={}) {
    let knownAttributes = ['schema', 'filePermission', 'defaultValues']
    let unknownAttribute = getUnknowwnAttribute(options, knownAttributes)

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

    if (!isFilePermission(result.filePermission)) {
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
function getUnknowwnAttribute(value, knownAttributes) {
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
function isUint(value) {
    return Number.isInteger(value) && value >= 0
}

/**
 *
 * @param {any} value
 * @returns {boolean}
 */
function isFilePermission(value) {
    return isUint(value) && (value <= 0o7777)
}

/**
 *
 * @param {string} filePath - Path to configuration file.
 * @param {uint} filePermission - If file permission is greater than this one
 * then throws error.
 * @returns {any} - Parsed data of configuration file.
 * @throws {InternalLoadingError}
 */
function loadFile(filePath, filePermission) {
    return parseFileData(
        readFile(filePath, filePermission)
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
function readFile(filePath, filePermission=0o600) {
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
                    upperBoundary: toOctal(filePermission),
                    actual: toOctal(actualPermission)
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
function parseFileData(data) {
    try {
        return commentJson.parse(data)
    }
    catch (error) {
        throwJsonParsingError(error)
    }
}

/**
 *
 * @param {number} value
 * @returns {string} - Octal string with prefix `0o`.
 */
function toOctal(value) {
    return '0o' + value.toString(8)
}

/**
 *
 * @param {any} conf
 * @param {JsonSchema} schema
 * @throws {InternalLoadingError}
 */
function validateConfiguration(conf, schema) {
    try {
        let ajv = new Ajv()

        ajvFormats(ajv)

        let valid = ajv.validate(schema, conf)

        if (!valid) {
            throwBadAttributeError(ajv.errors)
        }
    }
    catch (error) {
        if (error instanceof Ajv.MissingRefError) {
            throwMissingSchemaRefereneError(error)
        }

        if (isAjvStrictModeError(error)) {
            throw new InternalLoadingError('bad schema', {
                message: error.message
            })
        }

        throw error
    }
}

function isAjvStrictModeError(error) {
    return error instanceof Error &&
        /^strict mode:/.test(error.message)
}

function setDefaultValues(conf, default_values) {
    for (let key of Object.keys(default_values)) {
        setDefaultValue(conf, default_values, key)
    }
}

function setDefaultValue(conf, default_values, key) {
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
function throwJsonParsingError(error) {
    if (!isJsonParsingError(error)) {
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

function isJsonParsingError(error) {
    return error instanceof SyntaxError &&
        isUint(error.line) &&
        isUint(error.column)
}

/**
 * @param {Array<Ajv.ValidationError>} errors
 * @throws {InternalLoadingError}
 */
function throwBadAttributeError(errors) {
    if (!Array.isArray(errors) || errors.length <= 0) {
        throw new Error('invalid ajv validation errors')
    }

    throw new InternalLoadingError('bad attribute', errors[0])
}

/**
 *
 * @param {Ajv.MissingRefError} error
 * @throws {InternalLoadingError}
 */
function throwMissingSchemaRefereneError(error) {
    if (!isAjvMissingReferenceError(error)) {
        throw new Error('invalid ajv missing reference error')
    }

    let {missingRef, missingSchema, message} = error

    throw new InternalLoadingError(
        'bad schema',
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
function isAjvMissingReferenceError(error) {
    return error instanceof Ajv.MissingRefError &&
        isNonEmptyString(error.missingRef) &&
        isNonEmptyString(error.missingSchema) &&
        isNonEmptyString(error.message)
}

/**
 *
 * @param {any} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
    return (typeof value === 'string') && (value.length > 0)
}

module.exports = {
    load,
    LoadingError,
    formatOptions,
    loadFile
}
