chai = require 'chai'
chai.should()
expect = chai.expect

yaddle = require "./"
{parse, ParseError} = yaddle

describe "yaddle", ->

    describe "parseYAML", ->

        it "should complain for bad indentation", ->
            expect(-> parse " ").to.throw(ParseError "unexpected indentation", 1, 1)

        it "should complain for mixed indentation", ->
            expect(-> parse "obj:\n  k: str\n\tk2: int").to.throw(ParseError "mixed indentation", 3, 1)

        it "should complain for over indentation", ->
            expect(-> parse "obj:\n  k: str\n      k2: int").to.throw(ParseError "over indented", 3, 7)

        it "should complain for bad indentation", ->
            expect(-> parse "obj:\n  k: str\n   k2: int").to.throw(ParseError "bad indentation", 3, 4)
    
