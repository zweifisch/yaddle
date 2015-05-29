chai = require 'chai'
chai.should()
expect = chai.expect

yaddle = require "./"
{load, ParseError} = yaddle


describe "yaddle", ->

    describe "parsing", ->

        it "should complain for bad indentation", ->
            expect(-> load " ").to.throw(ParseError "unexpected indentation", 1, 1)

        it "should complain for mixed indentation", ->
            expect(-> load "obj:\n  k: str\n\tk2: int").to.throw(ParseError "mixed indentation", 3, 1)

        it "should complain for over indentation", ->
            expect(-> load "obj:\n  k: str\n      k2: int").to.throw(ParseError "over indented", 3, 7)

        it "should complain for bad indentation", ->
            expect(-> load "obj:\n  k: str\n   k2: int").to.throw(ParseError "bad indentation", 3, 4)

    describe "generating", ->

        it "should support int, str, null, object, array, bool, enum", ->

            schema = """
            str: str
            int: int
            num: num
            array: [int]
            object:
                key: str
            bool: bool
            enum: a | b | c
            null: null
            """

            load(schema).should.be.deep.equal
                type: "object"
                additionalProperties: false
                properties:
                    array:
                        items:
                            anyOf: [
                                {
                                    multipleOf: 1
                                    type: "number"
                                }
                            ]
                        type: "array"
                    bool:
                        type: "boolean"
                    enum:
                        enum: ["a", "b", "c"]
                    int:
                        multipleOf: 1
                        type: "number"
                    null:
                        type: "null"
                    num:
                        type: "number"
                    object:
                        additionalProperties: false
                        properties:
                            key:
                                type: "string"
                        required: ["key"]
                        type: "object"
                    str:
                        type: "string"
                required: ["str", "int", "num", "array", "object", "bool", "enum", "null"]

        it "should allow optional keys", ->

            schema = """
            name: str
            age?: int
            """

            load(schema).should.be.deep.equal
                type: "object"
                properties:
                    name:
                        type: "string"
                    age:
                        type: "number"
                        multipleOf: 1
                additionalProperties: no
                required: ["name"]

        it "should set min and max for num and int", ->

            schema = """
            size:
                width: num{10.8}
                height: num{20.1}
            count: int{1,10}
            weight: num{10,}
            """

            load(schema).should.be.deep.equal
                type: "object"
                properties:
                    size:
                        type: "object"
                        properties:
                            width:
                                type: "number"
                                maximum: 10.8
                            height:
                                type: "number"
                                maximum: 20.1
                        additionalProperties: no
                        required: ["width", "height"]
                    count:
                        type: "number"
                        maximum: 10
                        minimum: 1
                        multipleOf: 1
                    weight:
                        minimum: 10
                        type: "number"
                additionalProperties: no
                required: ["size", "count", "weight"]

        it "should pass the readme example", ->
            schema = """
            role: admin | author | collaborator | role with space

            user:
                name: str{3,20}
                age: int{10,200}
                gender: male | female
                roles: [$role]
                description?: str{200}
            """
            load(schema).properties.user.should.be.deep.equal
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "maxLength": 20,
                        "minLength": 3
                    },
                    "age": {
                        "type": "number",
                        "minimum": 10,
                        "maximum": 200,
                        "multipleOf": 1
                    },
                    "gender": {
                        "enum": ["male", "female"]
                    },
                    "roles": {
                        "type": "array",
                        "items": {
                            "anyOf": [
                                {
                                    "enum": ["admin", "author", "collaborator", "role with space"]
                                }
                            ]
                        }
                    },
                    "description": {
                        "type": "string",
                        "maxLength": 200
                    }
                },
                "required": ["name", "age", "gender", "roles"],
                "additionalProperties": false
