const fs = require('fs')
const jsYaml = require('js-yaml')

class Seed {
    // Input
    // * spec / Object - JSON Schema as specification data from configuration
    //   file.
    constructor(spec) {
        this._spec
    }

    // Input
    // * confFile / String - Path to configuration file.
    //
    // Output
    // * Object - Contains key-value pairs
    load(confFile) {
        let rawConf = _loadConfigFile(confFile)
        _verifyRawConf(rawConf)
        _applyDefaultValue(rawConf)

        return rawConf
    }

    // private members

    _loadConfigFile(confFile) {
        let raw = fs.readFileSync(confFile)
        let rawConf = jsYaml.safeLoad(raw)

        return rawConf
    }

    _verifyRawConf(rawConf) {

    }
}

module.exports = Seed
