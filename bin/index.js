#! /usr/bin/env node
const path = require('path')
const fs = require('fs')
const yargs = require('yargs')

/**
 *
 * @param string {string}
 */
const capitalizeString = (string) => {
    let result = ""
    const splitStringList = string.split('-')
    for (const text of splitStringList) {
        console.log(text)
        result += `${text.at(0).toUpperCase()}${text.slice(1)}`
    }
    return result
}

const createWriteStreamInstance = (path, fileName) => {
    return fs.createWriteStream(`${path}/${capitalizeString(fileName)}.js`);
}

const writeConstructor = (writeStream, constructorMap) => {
    writeStream.write(`  constructor (data = {}) {\n`);
    for (const [key, value] of Object.entries(constructorMap)) {
        writeStream.write(`\t\tthis.${key} = ${value}\n`);
    }
    writeStream.write(`  }\n`);
}

const writeJSONStream = (path, writeStream, json) => {
    const constructorMap = {}
    for (const [key, value] of Object.entries(json)) {
        const isArrayValue = Array.isArray(value)
        const isObjectValue = typeof value === 'object'
        if ((isArrayValue || isObjectValue) && value !== null) {
            writeStream.write(`  /** @type {${capitalizeString(key)}${isArrayValue ? '[]' : '|null'}} */\n`);
            writeStream.write(`  ${key} = ${isArrayValue ? '[]' : 'null'}\n\n`);
            constructorMap[key] = isArrayValue ? `data.${key} in data ? data.${key}.map((val) => new ${capitalizeString(key)}(val)) : []` : `data.${key} in data ? data.${key} : null`

            if (Array.isArray(value) && value.length < 1) continue;

            console.log(`* CREATING RELATE OBJECT: ${capitalizeString(key)}`);
            const arrayObjectKey = capitalizeString(key)
            let arrayWriteStream = createWriteStreamInstance(path, key)
            arrayWriteStream.write(`export default class ${arrayObjectKey} {\n`);
            writeJSONStream(path, arrayWriteStream, Array.isArray(value) ? value[0] : value)
            arrayWriteStream.write(`}`);
            arrayWriteStream.end();
            console.log(`* CREATED RELATE OBJECT: ${capitalizeString(key)}`);
        } else {
            writeStream.write(`  /** @type {${typeof value}|null} */\n`);
            writeStream.write(`  ${key} = null\n\n`);
            constructorMap[key] = `data.${key} || null`
        }
    }

    writeConstructor(writeStream, constructorMap)
}

/**
 *
 * @param path {string}
 * @param targetPath {string[]}
 */
const readFolder = (path, targetPath) => {
    console.log(`-----------------------------`);
    fs.readdir(path, (err, files) => {
        if (err) {
            return console.log(`Can't scan directory ${directoryPath}`)
        }

        for (const file of files) {

            if (targetPath.includes(file)) {
                console.log(file)
                const nextTargetPath = targetPath.shift();
                readFolder(`${path}/${nextTargetPath}`, targetPath)
                break;
            } else if (targetPath.length < 1) {
                const filePath = `${path}/${file}`
                const fileStatus = fs.lstatSync(filePath)
                const isFile = fileStatus.isFile()

                if (isFile && file.includes('.json')) {
                    /** @type {string} */
                    const jsonString = fs.readFileSync(filePath);
                    const jsonData = JSON.parse(jsonString);

                    const fileName = file.split('.')[0]
                    const writeStream = fs.createWriteStream(`${path}/${capitalizeString(fileName)}.js`);
                    const exportName = capitalizeString(fileName)
                    writeStream.write(`export default class ${exportName} {\n`);

                    writeJSONStream(path, writeStream, jsonData)

                    writeStream.write(`}`);
                    writeStream.end();

                    console.log(`* CREATED: ${exportName}`);
                }
            }
        }
    })
}

const usage = "\nUsage: Convert from JSON to POJO model";

const options = yargs
    .option("p", {alias: "path", describe: "Directory Path", type: "string[]", demandOption: false})
    .usage(usage)
    .help(true)
    .argv;

console.log(`----- BEGIN READ FILES -----`)
const directoryPath = process.cwd();
const targetPath = ['src', 'models']

if (yargs.argv.path) {
    const inputTargetPathList = yargs.argv.path.split('/')
    targetPath.push(...inputTargetPathList)
    console.log(targetPath)
}

readFolder(directoryPath, targetPath)

