const path = require('path')
const assert = require('assert')

const seed = require('../lib')

describe('seed.load()', () => {
    let schema = {
        type: 'object',
        additionalProperties: false,
        required: [
            'name',
            'gender',
            'age'
        ],
        properties: {
            name: {
                type: 'string'
            },
            gender: {
                type: 'string',
                enum: [
                    'male',
                    'female'
                ]
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
    let default_values = {
        'age': 18,
        'address.city': 'Ha Noi',
        'address.country': 'Vietnam'
    }

    it('not existed file throws error', () => {
        let file = _conf_file_path('not_existed_file.json')

        assert.throws(
            () => {
                seed.load(schema, file)
            }, 
            {
                name: 'Error',
                code: 'ENOENT'
            }
        )
    })

    it('invalid JSON format file throws error', () => {
        let file = _conf_file_path('invalid_json_file.txt')

        assert.throws(
            () => {
                seed.load(schema, file)
            },
            {
                name: 'SyntaxError',
                message: 'Unexpected token a in JSON at position 1'
            }
        )
    })

    it('empty file, schema requires properties throws error', () => {
        let file = _conf_file_path('empty_with_requirement.json')

        assert.throws(
            () => 
            {
                seed.load(schema, file)
            }, 
            {
                name: 'ConfigFileError',
                message: file
            }
        )
    })

    it('missing attributes throws error', () => {
        let file = _conf_file_path('miss_attribute.json')

        assert.throws(
            () => {
                seed.load(schema, file)
            }, 
            {
                name: 'ConfigFileError',
                message: file
            }
        )
    })

    it('invalid attribute type throws error', () => {
        let file = _conf_file_path('invalid_type.json')

        assert.throws(
            () => {
                seed.load(schema, file)
            }, 
            {
                name: 'ConfigFileError',
                message: file
            }
        )
    })


    it('empty file, schema does not require any properties', () => {
        let schema = {
            type: 'object',
            additionalProperties: false,
            required: [],
            properties: {
                name: {
                    type: 'string'
                },
                age: {
                    type: 'string'
                }
            }
        }
        let default_values = {
            name: 'mr. noob',
            age: 40
        }
        let file = _conf_file_path('empty_with_no_requirement.json')
        let actual_result = seed.load(schema, file, default_values)
        let expected_result = {
            name: 'mr. noob',
            age: 40
        }
    
        assert.deepStrictEqual(actual_result, expected_result)
    })

    it('default values', () => {
        let file = _conf_file_path('option_attribute.json')
        let actual_result = seed.load(schema, file, default_values)
        let expected_result = {
            name: 'kevin',
            age: 18,
            gender: 'male',
            address: {
                country: 'Vietnam',
                city: 'Ha Noi'
            }
        }

        assert.deepStrictEqual(actual_result, expected_result)
    })

    it('half of default values', () => {
        let file = _conf_file_path('half_option_attribute.json')
        let actual_result = seed.load(schema, file, default_values)
        let expected_result = {
            name: 'kevin',
            age: 18,
            gender: 'male',
            address: {
                country: 'Vietnam',
                city: 'Ho Chi Minh'
            }
        }

        assert.deepStrictEqual(actual_result, expected_result)
    })

    it('valid configuration file', () => {
        let file = _conf_file_path('valid.json')
        let actual_result = seed.load(schema, file)
        let expected_result = {
            name: 'kevin',
            age: 18,
            gender: 'male',
            address: {
                country: 'Vietnam',
                city: 'Ha Noi'
            }
        }

        assert.deepStrictEqual(actual_result, expected_result)
    })
})

function _conf_file_path(relative_path) {
    return path.join(__dirname, 'conf_file', relative_path)
}
