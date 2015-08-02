import path from "path";
import chai from 'chai';
import promised from "chai-as-promised";
import {parse} from "./parser";
import {Tokenizer, indent} from "./tokenizer";
import {loads, load} from "./index";

chai.use(promised);
chai.should();

describe("parse", _ => {

    describe("primtives", () => {
        it("should parse true and false", () =>
           parse("true").should.eventually.deep.equal(["enum", [true]]));
    });

    describe("enum", () => {
        it("should parse enum", () =>
           parse("true | false | null | \"null\"").should.eventually.
           deep.equal(["enum", [true, false, null, "null"]]));
    });

    describe("string", () => {
        it("should parse string", () =>
           parse("str").should.eventually.
           deep.equal(["string", [null, null]]));
        it("should parse length", () =>
           parse("str{1,10}").should.eventually.
           deep.equal(["string", [[1,10], null]]));
    });

    describe("array", () => {
        it("should parse array", () =>
           parse("[str]").should.eventually.deep.equal([
               "array", [[["string", [null, null]]], null, null]]));
        it("should parse array", () =>
           parse("[str, int]").should.eventually.deep.equal([
               "array", [[["string", [null, null]],
                          ["integer", null]],
                         null, null]]));
    });

    describe("object", () => {
        it("should parse object", () =>
           parse("key: true | false").should.eventually.deep
           .equal(["object",
                   [new Map([["key", ["enum", [true, false]]]]),
                    ["key"],
                    true,
                    new Map(),
                    null,
                    new Map()]]));
    });

});

describe("tokenize", _ => {
    describe("tokenize", () => {
        let tokenizer = new Tokenizer([
            ['NAME', /[A-Za-z_][A-Za-z_0-9-]*/],
            ['REGEXP', /\/.*\//],
            ['STRING', /"((\\")|[^"])*"/],
            ['OP', /([{}\[\]?$:,|@%!/&]|\.{3})/],
            ['NUMBER', /-?(0|[1-9]\d*)(\.\d+)?/],
            ['COMMENT', /#.*/],
            ['NL', /[\r\n]+([ \t]+[\r\n]+)*/],
            ['SPACE', /[ \t]+/]]);
        it("should tokenize", () =>
           [...tokenizer.tokenize("foo bar")].should.deep.equal([
               {type: 'NAME', start: [1,1], end: [1,3], value: "foo"},
               {type: 'SPACE', start: [1,4], end: [1,4], value: " "},
               {type: 'NAME', start: [1,5], end: [1,7], value: "bar"}
           ]));
        it("indentation", () => {
            let input = `
root:
    parent:
        child
    parent:
        child`;
            return [...indent(tokenizer.tokenize(input))].map(x=>x.type).should.deep.equal(
                "NL,NAME,OP,NL,INDENT,NAME,OP,NL,INDENT,NAME,NL,DEDENT,NAME,OP,NL,INDENT,NAME,DEDENT,DEDENT".split(',')
            );
        });
    });
});


describe("loads", _ => {

    describe("oneOf", () => {

        it("should loads oneOf", () => {
            let input = "@location | @vector";
            let expected = {oneOf: [
                {'$ref': '#/definitions/location'},
                {'$ref': '#/definitions/vector'}]};
            return loads(input).should.eventually.deep.equal(expected);
        });
    });

    describe("array", () => {
        it("should loads empty array", () => {
            let input = `[]`;
            let expected = {type: 'array'};
            return loads(input).should.eventually.deep.equal(expected);
        });

        it("should loads array", () => {
            let input = "[str]";
            let expected = {'type': 'array',
                            "items": {"type": "string"}};
            return loads(input).should.eventually.deep.equal(expected);
        });
    });
        
    describe("object", () => {
        it("should loads ojbect", () => {
            let input = `
role: str
active?: bool
null?: null
name: str
...`;
            let expected = {type: 'object',
                            properties: {role: {type: "string"},
                                         name: {type: "string"},
                                         null: {type: "null"},
                                         active: {type: "boolean"}},
                            required: ["role", "name"]};
            return loads(input).should.eventually.deep.equal(expected);
        });

        it("should loads nested object", () => {
            let input = `
role: str
location?:
    x: num
    y: num`;
            let expected = {type: 'object',
                            required: ["role"],
                            additionalProperties: false,
                            properties: {role: {type: "string"},
                                         location:
                                         {type: "object",
                                          required: ["x", "y"],
                                          additionalProperties: false,
                                          properties: {
                                              x: {type: "number"},
                                              y: {type: "number"}}}}};
            return loads(input).should.eventually.deep.equal(expected);
        });

        it("should generate definitions", () => {
            let input = `
@location:
    x: num
    y: num
start: @location
end: @location
`;
            let expected = {type: 'object',
                            definitions: {
                                location: {
                                    type: "object",
                                    properties: {
                                        x: {type: "number"},
                                        y: {type: "number"}},
                                    required: ["x", "y"],
                                    additionalProperties: false}
                            },
                            properties: {start: {'$ref': "#/definitions/location"},
                                         end: {'$ref': "#/definitions/location"}},
                            required: ["start", "end"],
                            additionalProperties: false};

            return loads(input).should.eventually.deep.equal(expected);
        });

    });
});

describe("load", _ => {

    describe("mount point", () => {

        it("should load", () => {
            let expected = {
                id: "http://some.site.somewhere/entry-schema#",
                // "$schema": "http://json-schema.org/draft-04/schema#",
                // "description": "schema for an fstab entry",
                type: "object",
                required: ["storage"],
                properties: {
                    storage: {
                        // "type": "object",
                        oneOf: [
                            {"$ref": "#/definitions/diskDevice"},
                            {"$ref": "#/definitions/diskUUID"},
                            {"$ref": "#/definitions/nfs"},
                            {"$ref": "#/definitions/tmpfs"}
                        ]
                    },
                    fstype: {
                        enum: ["ext3", "ext4", "btrfs"]
                    },
                    options: {
                        type: "array",
                        minItems: 1,
                        items: {type: "string"},
                        uniqueItems: true
                    },
                    readonly: {type: "boolean"}
                },
                definitions: {
                    diskDevice: {
                        type: "object",
                        properties: {
                            type: {enum: ["disk"]},
                            device: {
                                type: "string",
                                pattern: "^/dev/[^/]+(/[^/]+)*$"
                            }
                        },
                        required: ["type", "device"],
                        additionalProperties: false
                    },
                    diskUUID: {
                        type: "object",
                        properties: {
                            type: {"enum": ["disk"]},
                            label: {
                                type: "string",
                                pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$"  // noqa
                            }
                        },
                        required: ["type", "label"],
                        additionalProperties: false
                    },
                    nfs: {
                        type: "object",
                        properties: {
                            type: {"enum": ["nfs"]},
                            remotePath: {
                                type: "string",
                                pattern: "^(/[^/]+)+$"
                            },
                            server: {
                                // "type": "string",
                                oneOf: [
                                    {format: "hostname"},
                                    {format: "ipv4"},
                                    {format: "ipv6"}
                                ]
                            }
                        },
                        required: ["type", "remotePath", "server"],
                        additionalProperties: false
                    },
                    tmpfs: {
                        type: "object",
                        properties: {
                            type: {enum: ["tmpfs"]},
                            sizeInMB: {
                                type: "integer",
                                minimum: 16,
                                maximum: 512
                            }
                        },
                        required: ["type", "sizeInMB"],
                        additionalProperties: false
                    }
                }
            };
            return load(path.join(__dirname, "mountpoint.ydl")).should.eventually.deep.equal(expected);
        });

    });
});
