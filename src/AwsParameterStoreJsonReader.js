"use strict";

const {promisify} = require('util');
const AWS = require('aws-sdk');

module.exports = class AwsParameterStoreJsonReader {

    constructor(configuration) {
        this.configuration = configuration;
        const ssmConfig = configuration ? { "apiVersion": configuration.apiVersion } : undefined;

        this.ssm = new AWS.SSM(ssmConfig);
        this.ssm.getParametersByPathAsync = promisify(this.ssm.getParametersByPath);
    }

    postProcess(value) {
        if(value !== null && typeof value === "object" && !Array.isArray(value)) {
            return this.processArrays(value);
        }
        return value;
    }

    processArrays(object) {
        const keys = Object.keys(object);
        const numberKeys = keys.every((key) => /^\d+$/.test(key));

        if(numberKeys) {
            return keys.reduce((out, key) => {
                const index = parseInt(key);
                out[index] = this.postProcess(object[key]);
                return out;
            }, []);
        }

        return keys.reduce((out, key) => {
            out[key] = this.postProcess(object[key]);
            return out;
        }, object);
    }

    addParameter(object, parameter) {
        const path = parameter.Name.split("/");
        const deepObject = path.slice(1, -1).reduce((out, key) => {
            if(!(key in out)) {
                out[key] = {};
            } 
            return out[key];
        }, object);

        const key = path[path.length - 1];

        switch(parameter.Type) {
            case "StringList":
                deepObject[key] = parameter.Value.split(',');
            break;
            case "String":
            case "SecureString":
            default:
                deepObject[key] = parameter.Value;
            break;
        }

        return object;
    }

    processParameters(object, path, parameters) {
        const parametersWithoutPrefix = parameters.map((param) => {
            param.Name = param.Name.substring(path.length);
            return param;
        });

        return parametersWithoutPrefix.reduce(this.addParameter, object);
    }

    async getParametersByPath(currentObject, path, token) {
        const params = {
            "Path": path,
            "Recursive": true,
            "WithDecryption": true
        };

        if(token) {
            params.NextToken = token;
        }

        const result = await this.ssm.getParametersByPathAsync(params);

        const nextObject = this.processParameters(currentObject, path, result.Parameters);

        if("NextToken" in result) {
            return await this.getParametersByPath(nextObject, path, result.NextToken);
        }

        return nextObject;
    }

    async read(path) {
        const json = await this.getParametersByPath({}, path);

        return this.postProcess(json);
    }
}