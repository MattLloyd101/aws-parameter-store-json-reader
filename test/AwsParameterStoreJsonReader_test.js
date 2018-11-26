"use strict";

const chai = require('chai')
const should = chai.should();
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

const AWS = require('aws-sdk');
const AwsParameterStoreJsonReader = require('../src/AwsParameterStoreJsonReader');

const realSSM = AWS.SSM;

async function withSSMStub() {
	let body, fakeSSMInstance;
	if(arguments.length === 1) {
		body = arguments[0];
		fakeSSMInstance = {
			putParameter: function () {}
		};
	} else if(arguments.length === 2) {
		fakeSSMInstance = arguments[0];
		body = arguments[1];
	}

	const stub = AWS.SSM = sinon.stub(AWS.SSM, 'constructor').returns(fakeSSMInstance);
	
	if (body[Symbol.toStringTag] === 'AsyncFunction') {
		await body(stub, fakeSSMInstance);
	} else {
		body(stub, fakeSSMInstance);
	}
};

describe('AwsParameterStoreJsonReader', () => {
	const configuration = {
		"keyId": "arn:aws:kms:us-east-2:123456789012:key/1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d5e",
		"apiVersion": '2014-11-06'
	};

	after(() => {
		AWS.SSM = realSSM;
	});

	describe('constructor()', () => {

		it('should not return null', () => {
			expect(AwsParameterStoreJsonReader).to.not.be.null
		});
		it('should assign the configuration', () => {
			const parameterReader = new AwsParameterStoreJsonReader(configuration);
			expect(parameterReader.configuration).to.equal(configuration);
		});
		it('should instanciate an AWS SSM instance with config', async () => {
			await withSSMStub((stub, ssm) => {

				const parameterReader = new AwsParameterStoreJsonReader(configuration);

				expect(stub).to.have.been.calledWithNew;
				expect(stub.getCall(0).args[0]).to.be.equal(configuration.apiVersion);
				expect(parameterReader.ssm).to.be.equal(ssm);
			});
		});
		it('should instanciate an AWS SSM instance without config', async () => {
			await withSSMStub((stub, ssm) => {
				const parameterWriter = new AwsParameterStoreJsonReader();

				expect(stub).to.have.been.calledWithNew;
				expect(stub.getCall(0).args[0]).to.be.undefined;
				expect(parameterWriter.ssm).to.be.equal(ssm);
			});
		});
	});

});	