/*eslint-disable max-len*/

'use strict'

const assert = require('assert')
const seed = require('../lib')
const {getDataFile} = require('./_lib')

describe('seed.load: input', () => {
    it('invalid filePath, throws error', () => {
        let filePath = {}

        assert.throws(
            () => seed.load(filePath),
            {
                name: 'LoadingError',
                message: 'invalid file path',
                labels: {}
            }
        )
    })

    it('schema is not an object, throws error', () => {
        let filePath = 'no_need_file_path_yet'
        let schema = '{}'

        assert.throws(
            () => seed.load(filePath, {schema}),
            {
                name: 'LoadingError',
                message: 'invalid option: schema',
                labels: {}
            }
        )
    })

    it('schema refers to not existed definition, throws error', () => {
        let filePath = getDataFile('valid.json')
        let schema = {
            type: 'object',
            properties: {
                name: {
                    $ref: '//not/existed/reference'
                }
            }
        }

        assert.throws(
            () => seed.load(filePath, {schema}),
            {
                name: 'LoadingError',
                message: 'bad schema specification',
                labels: {
                    schema: '//not/existed/reference',
                    reference: '//not/existed/reference',
                    message: 'can\'t resolve reference //not/existed/reference from id #'
                }
            }
        )
    })

    it('invalid filePermission, throws error', () => {
        let filePath = 'no_need_file_path_yet'
        let options = {
            filePermission: 0o10000
        }

        assert.throws(
            () => seed.load(filePath, options),
            {
                name: 'LoadingError',
                message: 'invalid option: filePermission',
                labels: {}
            }
        )
    })

    it('invalid defaultValues, throws error', () => {
        let filePath = 'no_need_file_path_yet'
        let options = {
            defaultValues: '{}'
        }

        assert.throws(
            () => seed.load(filePath, options),
            {
                name: 'LoadingError',
                message: 'invalid option: defaultValues',
                labels: {}
            }
        )
    })

    it('has unknown option, throws error', () => {
        let filePath = 'no_need_file_path_yet'
        let options = {
            foo: 'one'
        }

        assert.throws(
            () => seed.load(filePath, options),
            {
                name: 'LoadingError',
                message: 'unknown option: foo',
                labels: {}
            }
        )
    })
})

describe('seed.load: file', () => {
    it('not existed, throws error', () => {
        let filePath = getDataFile('not_existed_file.json')

        assert.throws(
            () => {
                seed.load(filePath)
            },
            {
                name: 'LoadingError',
                message: 'file is not existed or access denied',
                labels: {}
            }
        )
    })

    it('invalid JSON format, throws error', () => {
        let filePath = getDataFile('invalid_json_format.json')

        assert.throws(
            () => seed.load(filePath),
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

    it('empty, throws error', () => {
        let filePath = getDataFile('empty.json')

        assert.throws(
            () => seed.load(filePath),
            {
                name: 'LoadingError',
                message: 'invalid JSON format'
            }
        )
    })

    it('has comments, should be fine', () => {
        let filePath = getDataFile('has_comment.json')
        let expectedResult = {
            name: 'name.foo',
            age: 18
        }
        let actualResult = seed.load(filePath)

        assert.deepStrictEqual(actualResult, expectedResult)
    })

    it('not a regular file, throws error', () => {
        let filePath = getDataFile('')

        assert.throws(
            () => seed.load(filePath),
            {
                name: 'LoadingError',
                message: 'not a regular file',
                labels: {}
            }
        )
    })

    it('invalid file permission, throws error', () => {
        let filePath = getDataFile('permission_701.json')
        let option = {
            filePermission: 0o700
        }

        assert.throws(
            () => seed.load(filePath, option),
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
            }
        }
    }

    it('invalid attribute types, throws error', () => {
        let filePath = getDataFile('invalid_type.json')

        assert.throws(
            () => {
                seed.load(filePath, {schema: SAMPLE_SCHEMA})
            },
            {
                name: 'LoadingError',
                message: 'bad configuration',
                labels: {
                    dataPath: '.age',
                    schemaPath: '#/properties/age/type',
                    message: 'should be integer'
                }
            }
        )
    })

    it('missing required attributes, throws error', () => {
        let filePath = getDataFile('missing_attribute.json')

        assert.throws(
            () => seed.load(filePath, {schema: SAMPLE_SCHEMA}),
            {
                name: 'LoadingError',
                message: 'bad configuration',
                labels: {
                    dataPath: '',
                    schemaPath: '#/required',
                    message: 'should have required property \'age\''
                }
            }
        )
    })

    it('missing not required attributes, return default values', () => {
        let filePath = getDataFile('optional_attribute.json')
        const defaultValues = {
            'address.country': 'country.foo',
            'address.city': 'city.bar'
        }
        let expectedResult = {
            name: 'foo',
            age: 18,
            address: {
                country: 'country.foo',
                city: 'city.bar'
            }
        }
        let options = {
            schema: SAMPLE_SCHEMA,
            defaultValues: defaultValues
        }
        let actualResult = seed.load(filePath, options)

        assert.deepStrictEqual(actualResult, expectedResult)
    })

    it('return valid configuration', () => {
        let filePath = getDataFile('valid.json')
        let expectedResult = {
            name: 'name.foo',
            age: 18,
            address: {
                country: 'country.foo',
                city: 'city.bar'
            }
        }
        let actualResult = seed.load(filePath, {schema: SAMPLE_SCHEMA})

        assert.deepStrictEqual(actualResult, expectedResult)
    })
})
