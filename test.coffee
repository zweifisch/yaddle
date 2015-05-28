chai = require 'chai'
chai.should()
expect = chai.expect

yaddle = require "./"

describe "yaddle", ->

    describe "parseYAML", ->

        it "should complain", ->

            expect(-> yaddle.parse " ").to.throw("unin")
    
