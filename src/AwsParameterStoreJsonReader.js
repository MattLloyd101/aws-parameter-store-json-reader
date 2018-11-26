"use strict";

const AWS = require('aws-sdk');

module.exports = class AwsParameterStoreJsonReader {

	constructor(configuration) {
		this.configuration = configuration;
		const apiVersion = configuration ? configuration.apiVersion : undefined;

		this.ssm = new AWS.SSM(apiVersion);
	}
}