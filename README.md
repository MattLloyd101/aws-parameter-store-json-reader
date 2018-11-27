# AWS Parameter Store JSON Reader

[![Build Status](https://travis-ci.org/MattLloyd101/aws-parameter-store-json-reader.svg?branch=master)](https://travis-ci.org/MattLloyd101/aws-parameter-store-json-reader)
[![npm version](https://badge.fury.io/js/aws-parameter-store-json-reader.svg)](https://badge.fury.io/js/aws-parameter-store-json-reader)

A Node.js library that reads JSON from AWS Parameter Store.

Meant to be used in conjunction with [aws-parameter-store-json-writer](https://github.com/MattLloyd101/aws-parameter-store-json-writer).

## Installation

via [npm](https://github.com/npm/npm)

```bash
npm install aws-parameter-store-json-reader
```

## Usage

```javascript
const AwsParameterStoreJsonReader = require('aws-parameter-store-json-reader');

const parameterReader = new AwsParameterStoreJsonReader({
    "apiVersion": '2014-11-06',
});

async function readConfig(path) {
    return await parameterReader.read(path);
}

readConfig("/ContentManagement/ContentManagementAggregator");
```

The above assumes that the values in the path adhere to the JSON structure provided by [aws-parameter-store-json-writer](https://github.com/MattLloyd101/aws-parameter-store-json-writer). e.g.

| Name | Type | Key ID | Value |
| ---- | ---- | ------ | ----- |
| `/ContentManagement/ContentManagementAggregator/dev/db/username` | String | - | dev-user |
| `/ContentManagement/ContentManagementAggregator/dev/db/password` | SecureString | arn:aws:kms:us-east-2:123456789012:key/1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d5e | secret-password |
| `/ContentManagement/ContentManagementAggregator/dev/tags` | StringList | - | "dev", "database" |
| `/ContentManagement/ContentManagementAggregator/dev/ids` | StringList | - | "12", "42", "128" |
| `/ContentManagement/ContentManagementAggregator/dev/objs/0/entry` | String | - | "1" |
| `/ContentManagement/ContentManagementAggregator/dev/objs/1/entry` | String | - | "2" |
| `/ContentManagement/ContentManagementAggregator/dev/objs/2/entry` | String | - | "3" |
| `/ContentManagement/ContentManagementAggregator/prod/db/username` | String | - | prod-user |
| `/ContentManagement/ContentManagementAggregator/prod/db/password` | SecureString | arn:aws:kms:us-east-2:123456789012:key/1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d5e | super-secret-password |

## Parameter Store Json Writer Configuration

**apiVersion** – (optional) The version of the AWS API you wish to be using.

## Versioning

This library uses the [Semver](https://semver.org/) versioning system. The numbers do not relate to maturity but the number of breaking changes introduced.
