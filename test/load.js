const path = require('path')
const assert = require('assert')

const seed = require('../lib')

describe('seed.load()', () => {
    let schema = {
        type: 'object',
        additionalProperties: false,
        required: [
            'name',
            'age',
            'address'
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
                type: 'string'
            }
        }
    }

    it('with not existed file', () => {
        let file = _conf_file_path('not_existed_file.yaml')

        assert.throws(() => {
            seed.load(schema, file)
        }, {
            name: 'Error',
            code: 'ENOENT'
        })
    })

    it('with valid configuration file', () => {
        let file = _conf_file_path('valid.yaml')
        let conf = seed.load(schema, file)

        assert.equal(conf.name, 'kevin')
        assert.equal(conf.age, 18)
        assert.equal(conf.address, 'Vietnam')
    })

    it('with empty configuration file', () => {
        let file = _conf_file_path('empty.yaml')

        assert.throws(() => {
            seed.load(schema, file)
        }, {
            name: 'InvalidConfigFile',
            message: file
        })
    })

    it('with missing attribute from configuration file', () => {
        let file = _conf_file_path('miss_attribute.yaml')

        assert.throws(() => {
            seed.load(schema, file)
        }, {
            name: 'InvalidConfigFile',
            message: file
        })
    })

    it('with invalid type attribute from configuration file', () => {
        let file = _conf_file_path('invalid_type.yaml')

        assert.throws(() => {
            seed.load(schema, file)
        }, {
            name: 'InvalidConfigFile',
            message: file
        })
    })
})

// private members

function _conf_file_path(relative_path) {
    return path.join(__dirname, 'conf_file', relative_path)
}
