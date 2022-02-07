'use strict'

/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */

const assert = require('assert')
const os = require('os')
const path = require('path')
const mockFs = require('mock-fs')
const seed = require('../lib')
const {getDataFilePath, readDataFile} = require('./_lib')

describe('seed.load: input', () => {
    it('invalid option identity, throws error', () => {
        let options = {
            identity: '!@#$'
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'invalid option: identity'
            }
        )
    })
    it('invalid option filePath, throws error', () => {
        let options = {
            identity: 'foo',
            filePath: {}
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'invalid option: filePath',
                labels: {}
            }
        )
    })
    it('schema is not an object, throws error', () => {
        let options = {
            identity: 'foo',
            schema: '{}'
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'invalid option: schema',
                labels: {}
            }
        )
    })
    it('schema has unknown keyword, throws error', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('valid.json'),
            schema: {
                unknownKeyword: 'one'
            }
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'bad schema',
                labels: {
                    message: 'strict mode: unknown keyword: "unknownKeyword"'
                }
            }
        )
    })
    it('schema refers to not existed definition, throws error', () => {
        let schema = {
            type: 'object',
            properties: {
                name: {
                    $ref: '//not/existed/reference'
                }
            }
        }
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('valid.json'),
            schema: schema
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'bad schema',
                labels: {
                    schema: '//not/existed/reference',
                    reference: '//not/existed/reference',
                    message: 'can\'t resolve reference //not/existed/reference from id #'
                }
            }
        )
    })
    it('invalid filePermission, throws error', () => {
        let options = {
            identity: 'foo',
            filePermission: 0o10000
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'invalid option: filePermission',
                labels: {}
            }
        )
    })
    it('invalid defaultValues, throws error', () => {
        let options = {
            identity: 'foo',
            defaultValues: '{}'
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'invalid option: defaultValues',
                labels: {}
            }
        )
    })
    it('has unknown option, throws error', () => {
        let options = {
            foo: 'one'
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'unknown option: foo',
                labels: {}
            }
        )
    })
})
describe('seed.load: file', () => {
    afterEach(() => {
        mockFs.restore()
    })
    it('not existed, throws error', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('not_existed_file.json')
        }
        assert.throws(
            () => {
                seed.load(options)
            },
            {
                name: 'LoadingError',
                message: 'file is not existed or access denied',
                labels: {}
            }
        )
    })
    it('invalid JSON format, throws error', () => {
        let filePath = 'invalid_json_format_1.json'
        mockFs({
            [filePath]: mockFs.file({
                content: readDataFile(filePath),
                mode: 0o600
            })
        })
        let options = {
            identity: 'foo',
            filePath: filePath
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'invalid JSON format',
                labels: {
                    line: 1,
                    column: 0
                }
            }
        )
    })
    it('invalid JSON format, throws error', () => {
        let filePath = 'invalid_json_format_2.json'
        mockFs({
            [filePath]: mockFs.file({
                content: readDataFile(filePath),
                mode: 0o600
            })
        })
        let options = {
            identity: 'foo',
            filePath: filePath
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'invalid JSON format',
                labels: {
                    line: 1,
                    column: 2
                }
            }
        )
    })
    it('empty, throws error', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('empty.json')
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'invalid JSON format'
            }
        )
    })
    it('has comments, should be fine', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('has_comment.json')
        }
        let expectedResult = {
            name: 'name.foo',
            age: 18
        }
        let actualResult = seed.load(options)
        assert.deepStrictEqual(actualResult, expectedResult)
    })
    it('not a regular file, throws error', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('')
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'not a regular file',
                labels: {}
            }
        )
    })
    it('invalid file permission, throws error', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('permission_701.json'),
            filePermission: 0o700
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'file permission is too open',
                labels: {
                    upperBoundary: '0o700',
                    actual: '0o701'
                }
            }
        )
    })
})
describe('seed.load: configuration', () => {
    const SAMPLE_SCHEMA = {
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
                    city: {
                        type: 'string'
                    },
                    country: {
                        type: 'string'
                    }
                }
            },
            friends: {
                type: 'array',
                items: {
                    type: 'string'
                }
            }
        }
    }
    it('invalid attribute types, throws error', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('invalid_type.json'),
            schema: SAMPLE_SCHEMA
        }
        assert.throws(
            () => {
                seed.load(options)
            },
            {
                name: 'LoadingError',
                message: 'bad attribute',
                labels: {
                    instancePath: '/age',
                    keyword: 'type',
                    params: {
                        type: 'integer'
                    },
                    schemaPath: '#/properties/age/type',
                    message: 'must be integer'
                }
            }
        )
    })
    it('missing required attributes, throws error', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('missing_attribute.json'),
            schema: SAMPLE_SCHEMA
        }
        assert.throws(
            () => seed.load(options),
            {
                name: 'LoadingError',
                message: 'bad attribute',
                labels: {
                    instancePath: '',
                    keyword: 'required',
                    schemaPath: '#/required',
                    params: {
                        missingProperty: 'age'
                    },
                    message: 'must have required property \'age\''
                }
            }
        )
    })
    it('missing not required attributes, return default values', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('optional_attribute.json'),
            schema: SAMPLE_SCHEMA,
            defaultValues: {
                'address.country': 'country.foo',
                'address.city': 'city.bar'
            }
        }
        let expectedResult = {
            name: 'foo',
            age: 18,
            address: {
                country: 'country.foo',
                city: 'city.bar'
            }
        }
        let actualResult = seed.load(options)
        assert.deepStrictEqual(actualResult, expectedResult)
    })
    it('return valid configuration', () => {
        let options = {
            identity: 'foo',
            filePath: getDataFilePath('valid.json'),
            schema: SAMPLE_SCHEMA
        }
        let expectedResult = {
            name: 'name.foo',
            age: 18,
            address: {
                country: 'country.foo',
                city: 'city.bar'
            },
            friends: ['foo', 'bar']
        }
        let actualResult = seed.load(options)
        assert.deepStrictEqual(actualResult, expectedResult)
    })
})
describe('seed.load from current working directory', () => {
    before(() => {
        let cwdFilePath = 'config.json'
        let userFilePath = path.join(os.homedir(), '.config/foo/config.json')
        let systemFilePath = '/etc/foo/config.json'
        mockFs({
            [cwdFilePath]: mockFs.file({
                mode: 0o600,
                content: '{"foo": "bar"}'
            }),
            [userFilePath]: mockFs.file({
                content: '{}'
            }),
            [systemFilePath]: mockFs.file({
                content: '{}'
            })
        })
    })
    after(() => mockFs.restore())
    it('successfully', () => {
        let options = {
            identity: 'foo'
        }
        let expectedResult = {
            foo: 'bar'
        }
        let actualResult = seed.load(options)
        assert.deepStrictEqual(actualResult, expectedResult)
    })
})
describe('seed.load from home configuration file', () => {
    before(() => {
        let userFilePath = path.join(os.homedir(), '.config/foo/config.json')
        let systemFilePath = '/etc/foo/config.json'
        mockFs({
            [userFilePath]: mockFs.file({
                mode: 0o600,
                content: '{"foo": "bar"}'
            }),
            [systemFilePath]: mockFs.file({
                content: '{}'
            })
        })
    })
    after(() => mockFs.restore())
    it('successfully', () => {
        let options = {
            identity: 'foo'
        }
        let expectedResult = {
            foo: 'bar'
        }
        let actualResult = seed.load(options)
        assert.deepStrictEqual(actualResult, expectedResult)
    })
})
describe('seed.load from system configuration file', () => {
    before(() => {
        let systemFilePath = '/etc/foo/config.json'
        mockFs({
            [systemFilePath]: mockFs.file({
                mode: 0o600,
                content: '{"foo": "bar"}'
            })
        })
    })
    after(() => mockFs.restore())
    it('successfully', () => {
        let options = {
            identity: 'foo'
        }
        let expectedResult = {
            foo: 'bar'
        }
        let actualResult = seed.load(options)
        assert.deepStrictEqual(actualResult, expectedResult)
    })
})
