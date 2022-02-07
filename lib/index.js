'use strict'

const fs = require('fs')
const lodash = require('lodash')
const Ajv = require('ajv')
const ajvFormats = require('ajv-formats')
const commentJson = require('comment-json')
const untildify = require('untildify')

/**
 * Pattern: `/^[a-zA-Z0-9]+$/`.
 *
 * @typedef {string} ConfigurationIdentity
 */

/**
 * Unsigned integer, less than or equal 0o7777.
 *
 * @typedef {number} FilePermission
 */

/**
 * @typedef {object} Options
 * @property {ConfigurationIdentity} identity - Identity of configuration.
 * It is use for detecting path to configuration file. There are files to
 * load by order:
 * 1. `./config.json`.
 * 2. `~/config/{identity}/config.json`.
 * 3. `/etc/{identity}/config.json`.
 * @property {string} [filePath=undefined] - Override path to configuration
 * file, ignore attribute `identity`.
 * @property {object} [schema={}] - JSON schema that specifies configuration.
 * @property {object} [defaultValues={}] - Key-value pairs for default values,
 * it is the same as argument `path` from `lodash.set()`.
 * @property {FilePermission} [filePermission=0o0600] - If file permission is
 * greater than this one then throws error.
 */

/**
 * Report error to outside of this package.
 */
class LoadingError extends Error {
    /**
     *
     * @param {string} message - Short description.
     * @param {string | undefined} filePath - Path to configuration file.
     * @param {object} labels - Additional information.
     */
    constructor(message, filePath = undefined, labels = {}) {
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
    constructor(message, labels = {}) {
        super(message)
        this.name = 'InternalLoadingError'
        this.labels = labels
    }
}

/**
 * Load and validate configuration file.
 *
 * @param {Options} [options={}] - Options for loading.
 * @return {any} Valid configuration from file.
 * @throws {LoadingError}
 */
function load(options = {}) {
    let {
        filePath,
        filePermission,
        schema,
        defaultValues
    } = formatOptions(options)
    try {
        let config = loadFile(filePath, filePermission)
        validateConfiguration(config, schema)
        setDefaultValues(config, defaultValues)
        return config
    }
    catch (error) {
        throw throwLoadingError(filePath, error)
    }
}

/**
 *
 * @param {any} value
 * @return {boolean}
 */
function isValidFilePath(value) {
    return (value === undefined) || isNonEmptyString(value)
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
 * @return {Options} - Valid options.
 * @throws {LoadingError}
 */
function formatOptions(options = {}) {
    validateOptionAttributes(options)
    let result = {
        filePath: undefined,
        schema: {},
        filePermission: 0o600,
        defaultValues: {}
    }
    Object.assign(result, options)
    if (!isValidIdentity(result.identity)) {
        throw new LoadingError('invalid option: identity')
    }
    if (!isValidFilePath(result.filePath)) {
        throw new LoadingError('invalid option: filePath')
    }
    if (typeof result.schema !== 'object') {
        throw new LoadingError('invalid option: schema')
    }
    if (!isFilePermission(result.filePermission)) {
        throw new LoadingError('invalid option: filePermission')
    }
    if (typeof result.defaultValues !== 'object') {
        throw new LoadingError('invalid option: defaultValues')
    }
    if (result.filePath === undefined) {
        result.filePath = getStandardFilePath(result.identity)
    }
    return result
}

/**
 *
 * @param {any} options
 * @throws {LoadingError}
 */
function validateOptionAttributes(options) {
    if (typeof options !== 'object') {
        throw new LoadingError('options is not a object')
    }
    let knownAttributes = [
        'identity',
        'filePath',
        'schema',
        'filePermission',
        'defaultValues'
    ]
    let unknownAttribute = getUnknowwnAttribute(options, knownAttributes)
    if (unknownAttribute) {
        throw new LoadingError(`unknown option: ${unknownAttribute}`)
    }
}

/**
 *
 * @param {any} value
 * @return {boolean}
 */
function isValidIdentity(value) {
    if (typeof value !== 'string') {
        return false
    }
    return /^[a-zA-Z0-9._]+$/.test(value)
}

/**
 *
 * @param {any} value
 * @param {Array<string>} knownAttributes
 * @return {string | undefined}
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
 * @return {boolean}
 */
function isUint(value) {
    return Number.isInteger(value) && value >= 0
}

/**
 *
 * @param {any} value
 * @return {boolean}
 */
function isFilePermission(value) {
    return isUint(value) && (value <= 0o7777)
}

/**
 * @param {string} filePath - Override for configuration file path which is
 * made from argument `name`.
 * @param {FilePermission} filePermission - If file permission is greater than
 * this one then throws error.
 * @return {any} - Parsed data of configuration file.
 * @throws {LoadingError}
 */
function loadFile(filePath, filePermission) {
    let data = readFile(filePath, filePermission)
    return parseFileData(data)
}

/**
 *
 * @param {string} filePath - Override path to configuration file
 * which is made from argument `name`.
 * @param {FilePermission} filePermission - If file permission is greater than
 * this one then throws error.
 * @return {string} - File content.
 * @throws {LoadingError}
 */
function readFile(filePath, filePermission = 0o600) {
    try {
        let fileStat = fs.statSync(filePath)
        if (!fileStat.isFile()) {
            throw new LoadingError('not a regular file', filePath)
        }
        let actualPermission = fileStat.mode & 0o0777
        if (actualPermission > filePermission) {
            throw new LoadingError(
                'file permission is too open',
                filePath,
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
            throw new LoadingError(
                'file is not existed or access denied',
                filePath
            )
        }
        throw error
    }
}

/**
 *
 * @param {string} configurationId
 * @param {string | undefined} overridePath
 * @return {string}
 * @throws {LoadingError}
 */
function getStandardFilePath(configurationId, overridePath = undefined) {
    if (overridePath) {
        return untildify(overridePath)
    }
    let cwdFilePath = untildify('./config.json')
    if (fs.existsSync(cwdFilePath)) {
        return cwdFilePath
    }
    let userFilePath = untildify(`~/.config/${configurationId}/config.json`)
    if (fs.existsSync(userFilePath)) {
        return userFilePath
    }
    let systemFilePath = untildify(`/etc/${configurationId}/config.json`)
    if (fs.existsSync(systemFilePath)) {
        return systemFilePath
    }
    throw new LoadingError('no configuration file', cwdFilePath)
}

/**
 * Convert CommentArray from `commentJson.parse()` to built-in `Array`.
 *
 * @param {any} _key
 * @param {any} value
 * @return {any}
 */
function normalizeCommentArray(_key, value) {
    if (value instanceof commentJson.CommentArray) {
        return Array.from(value)
    }
    else {
        return value
    }
}

/**
 *
 * @param {string} data
 * @return {any}
 * @throws {InternalLoadingError}
 */
function parseFileData(data) {
    try {
        return commentJson.parse(data, normalizeCommentArray, true)
    }
    catch (error) {
        throwJsonParsingError(error)
    }
}

/**
 *
 * @param {number} value
 * @return {string} - Octal string with prefix `0o`.
 */
function toOctal(value) {
    return '0o' + value.toString(8)
}

/**
 *
 * @param {any} conf
 * @param {object} schema
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

/**
 *
 * @param {Error} error
 * @return {boolean}
 */
function isAjvStrictModeError(error) {
    return error instanceof Error &&
        /^strict mode:/.test(error.message)
}

/**
 * Set default value for all attributes in configuration.
 *
 * @param {object} conf
 * @param {object} defaultValues - Pair key-value, where key is attribute name
 * and value is it's default value.
 */
function setDefaultValues(conf, defaultValues) {
    for (let key of Object.keys(defaultValues)) {
        setDefaultValue(conf, defaultValues, key)
    }
}

/**
 * Set default value for an attribute in configuration.
 *
 * @param {object} conf
 * @param {object} defaultValues - Pair key-value, where key is attribute name
 * and value is it's default value.
 * @param {string} key - Follow `set()` from `lodash`.
 */
function setDefaultValue(conf, defaultValues, key) {
    let v = lodash.get(conf, key)
    if (v === undefined) {
        lodash.set(conf, key, defaultValues[key])
    }
}

/**
 *
 * @param {Error} error - Throw by `parse()` from `comment-json`.
 * Unfortunately, hanlding is complex because of the function throws errors
 * inconsistency.
 * @throws {InternalLoadingError}
 */
function throwJsonParsingError(error) {
    if ((error instanceof Error) === false) {
        throw new InternalLoadingError('comment-json throws bad object')
    }
    let line = error.line || error.lineNumber
    let {column} = error
    if (!isUint(line) || !isUint(column)) {
        throw new InternalLoadingError('comment-josn throws bad error')
    }
    throw new InternalLoadingError('invalid JSON format', {line, column})
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
 * @return {boolean}
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
 * @return {boolean}
 */
function isNonEmptyString(value) {
    return (typeof value === 'string') && (value.length > 0)
}

module.exports = {
    load,
    LoadingError,
    _private: {
        getStandardFilePath
    }
}
