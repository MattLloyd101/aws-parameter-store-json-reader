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

function fakeResponse(parameters, token) {
    const paramsAsJson = parameters.map((param) => {
        return { 
            "Name": param[0],
            "Type": param[1],
            "Value": param[2]
        };
    });

    const result = {
       "Parameters": paramsAsJson
    };

    if(token) result["NextToken"] = token

    return result;
};

async function withSSMStub() {
    let body, fakeSSMInstance;
    if(arguments.length === 1) {
        body = arguments[0];
        fakeSSMInstance = {
            getParametersByPath: function () {}
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
                const parameterReader = new AwsParameterStoreJsonReader();

                expect(stub).to.have.been.calledWithNew;
                expect(stub.getCall(0).args[0]).to.be.undefined;
                expect(parameterReader.ssm).to.be.equal(ssm);
            });
        });
    });

    describe('read()', () => {
        it('should call getParametersByPath with the correct params', async () => {
            const fake = { getParametersByPath: function (_, callback) { callback(null, { Parameters: [] }); } };
            const spy = sinon.spy(fake, 'getParametersByPath');

            await withSSMStub(fake, async (stub, ssm) => {
                const parameterReader = new AwsParameterStoreJsonReader();

                const result = await parameterReader.read("/path");

                const params = {
                    "Path": "/path",
                    "Recursive": true,
                    "WithDecryption": true
                };
                spy.withArgs(params).calledOnce;
            });
        });

        it('should call getParametersByPath with again until there is no NextToken', async () => {
            const response1 = fakeResponse([["/prefix/dev/db/username", "String", "dev-user"]], "token1");
            const response2 = fakeResponse([["/prefix/dev/db/password", "SecureString", "secret-password"]], "token2");
            const response3 = fakeResponse([["/prefix/prod/db/username", "String", "prod-user"]], "token3");
            const response4 = fakeResponse([["/prefix/prod/db/password", "SecureString", "super-secret-password"]]);

            const getParametersByPath = sinon.stub();
            getParametersByPath.onCall(0).yields(null, response1);
            getParametersByPath.onCall(1).yields(null, response2);
            getParametersByPath.onCall(2).yields(null, response3);
            getParametersByPath.onCall(3).yields(null, response4);
            const fake = { getParametersByPath: getParametersByPath };

            await withSSMStub(fake, async (stub, ssm) => {
                const parameterReader = new AwsParameterStoreJsonReader();

                const result = await parameterReader.read("/path");

                const params1 = { "Path": "/path", "Recursive": true, "WithDecryption": true };
                const params2 = { "Path": "/path", "Recursive": true, "WithDecryption": true, "NextToken": "token1" };
                const params3 = { "Path": "/path", "Recursive": true, "WithDecryption": true, "NextToken": "token2" };
                const params4 = { "Path": "/path", "Recursive": true, "WithDecryption": true, "NextToken": "token3" };

                expect(getParametersByPath).to.have.been.calledWith(params1);
                expect(getParametersByPath).to.have.been.calledWith(params2);
                expect(getParametersByPath).to.have.been.calledWith(params3);
                expect(getParametersByPath).to.have.been.calledWith(params4);
            });
        });

        it('should build a json object for a simple structure', async () => {
            const response = fakeResponse([
                ["/key", "String", "value"]
            ]);
            const fake = { getParametersByPath: sinon.fake.yields(null, response) };
            await withSSMStub(fake, async (stub, ssm) => {
                const parameterReader = new AwsParameterStoreJsonReader();

                const result = await parameterReader.read("");
                const json = { "key": "value" };
                expect(result).to.eql(json);
            });
        });
        it('should build an array for a simple structure', async () => {
            const response = fakeResponse([
                ["/key", "StringList", "value1,value2,value3"]
            ]);
            const fake = { getParametersByPath: sinon.fake.yields(null, response) };
            await withSSMStub(fake, async (stub, ssm) => {
                const parameterReader = new AwsParameterStoreJsonReader();

                const result = await parameterReader.read("");
                const json = { "key": ["value1","value2","value3"] };
                expect(result).to.eql(json);
            });
        });
        it('should build an array for a more complex structure', async () => {
            const response = fakeResponse([
                ["/key/0", "String", "value1"],
                ["/key/1", "String", "value2"],
                ["/key/2", "String", "value3"]
            ]);
            const fake = { getParametersByPath: sinon.fake.yields(null, response) };
            await withSSMStub(fake, async (stub, ssm) => {
                const parameterReader = new AwsParameterStoreJsonReader();

                const result = await parameterReader.read("");
                const json = { "key": ["value1","value2","value3"] };
                expect(result).to.eql(json);
            });
        });
        it('should build an array for an even more complex structure', async () => {
            const response = fakeResponse([
                ["/key/0/entry", "String", "value1"],
                ["/key/1/entry", "String", "value2"],
                ["/key/2/entry", "String", "value3"]
            ]);
            const fake = { getParametersByPath: sinon.fake.yields(null, response) };
            await withSSMStub(fake, async (stub, ssm) => {
                const parameterReader = new AwsParameterStoreJsonReader();

                const result = await parameterReader.read("");
                const json = { "key": [{ "entry":"value1" }, {"entry": "value2"},{ "entry": "value3"}] };
                expect(result).to.eql(json);
            });
        });
        it('should build a json object for a simple structure with prefix', async () => {
            const response = fakeResponse([
                ["/prefix/key", "String", "value"]
            ]);
            const fake = { getParametersByPath: sinon.fake.yields(null, response) };
            await withSSMStub(fake, async (stub, ssm) => {
                const parameterReader = new AwsParameterStoreJsonReader();

                const result = await parameterReader.read("/prefix");
                const json = { "key": "value" };
                expect(result).to.eql(json);
            });
        });

        it('should build a json object for a more complex structure', async () => {
            const response = fakeResponse([
                ["/prefix/dev/db/username", "String", "dev-user"],
                ["/prefix/dev/db/password", "SecureString", "secret-password"],
                ["/prefix/prod/db/username", "String", "prod-user"],
                ["/prefix/prod/db/password", "SecureString", "super-secret-password"],
            ]);
            const fake = { getParametersByPath: sinon.fake.yields(null, response) };
            await withSSMStub(fake, async (stub, ssm) => {
                const parameterReader = new AwsParameterStoreJsonReader();

                const result = await parameterReader.read("/prefix");
                const json = {
                    "dev": {
                        "db": {
                            "username": "dev-user",
                            "password": "secret-password"
                        }
                    },
                    "prod": {
                        "db": {
                            "username": "prod-user",
                            "password": "super-secret-password"
                        }
                    }
                };
                expect(result).to.eql(json);
            });
        });
    });

});    