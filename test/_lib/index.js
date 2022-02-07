'use strict'

const path = require('path')
const fs = require('fs')

/**
 * Retrive absolute path from relative path at directory `../_data`.
 *
 * @param {string} relativePath
 * @return {string}
 */
function getDataFilePath(relativePath) {
    return path.join(__dirname, '..', '_data', relativePath)
}

/**
 *
 * @param {string} relativePath
 * @return {string}
 */
function readDataFile(relativePath) {
    let realPath = getDataFilePath(relativePath)
    return fs.readFileSync(realPath, 'utf-8')
}

module.exports = {
    getDataFilePath,
    readDataFile
}
