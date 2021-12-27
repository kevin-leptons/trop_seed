'use strict'

const path = require('path')

/**
 *
 * @param {string} relativePath - Relative from directory `./_data`.
 * @returns {string} - Absolute path to file.
 */
function getDataFile(relativePath) {
    return path.join(__dirname, '..', '_data', relativePath)
}

module.exports = {
    getDataFile
}
