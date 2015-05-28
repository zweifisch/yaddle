
keywords =
    str: yes
    int: yes
    num: yes

matchArray = (input, pattern, shift=0)->
    ret = []
    for p, idx in pattern
        if "string" is typeof p and "$" is p.charAt 0
            ret.push input[idx + shift]
        else
            return if p isnt input[idx + shift]
    ret

match = (input, shift, args...)->
    failed = if args.length % 2 then args.pop()
    for i in [0..(args.length / 2)]
        if values = matchArray input, args[i + i], shift
            return args[i + i + 1] values...
    failed() if failed

ParseError = (message, lineno, pos)->
    "#{message} at #{lineno}:#{pos}"

parseYAML = (input)->

    ret = {}

    indenting = no
    indent =
        with: ""
        count: 0
    lastlineIndent = 0
    curlineIndent = 0

    prev = null

    lineno = 1
    pos = 0

    buffered = ""

    skip = no

    tokens = []

    lengthOpen = no
    skipWhiteSpace = no

    for i in [0...input.length]
        cur = input.charAt i

        if startNewline
            startNewline = no
            lastlineIndent = curlineIndent
            indenting = no
            buffered = ""
            lineno += 1
            pos = 1
        else
            pos += 1

        switch cur
            when "\n"
                startNewline = yes
                lastlineIndent = curlineIndent
                tokens.push buffered if buffered
            when " "
                if pos is 1
                    if indent.with
                        throw ParseError "mixed indentation", lineno, pos unless indent.with is " "
                    else
                        indent.with = " "
                    switch prev
                        when null then throw ParseError "unexpected indentation", lineno, pos
                    indenting = yes
                skip = not indenting and skipWhiteSpace
            when "\t"
                if pos is 1
                    if indent.with
                        throw ParseError "mixed indentation", lineno, pos unless indent.with is "\t"
                    else
                        indent.with = "\t"
                    switch prev
                        when null then throw ParseError "unexpected indentation", lineno, pos
                    indenting = yes
            when ":"
                tokens.push ":indent"
                tokens.push curlineIndent
                tokens.push ":key"
                tokens.push buffered
                buffered = ""
                skip = yes
                skipWhiteSpace = yes
            when "{"
                throw ParseError "unexpected type '#{buffered}'", lineno, pos unless keywords[buffered]
                tokens.push buffered
                tokens.push "{"
                buffered = ""
                skip = yes
                lengthOpen = yes
            when "}"
                if not lengthOpen
                    throw ParseError "unexpected }", lineno, pos
                lengthOpen = no
                tokens.push buffered if buffered
                tokens.push "}"
                buffered = ""
                skip = yes
            when ","
                if not lengthOpen
                    throw ParseError "unexpected ,", lineno, pos
                tokens.push buffered if buffered
                tokens.push ","
                buffered = ""
                skip = true
            when "\r"
                skip = yes
            else
                skipWhiteSpace = no
                if indenting
                    indenting = no
                    if indent.count
                        throw ParseError "bad indentation", lineno, pos if buffered.length % indent.count
                    else
                        indent.count = buffered.length
                    curlineIndent = buffered.length / indent.count
                    buffered = ""
                    if curlineIndent > lastlineIndent + 1
                        throw ParseError "over indented", lineno, pos

        if skip
            skip = no
        else
            buffered += cur
        prev = cur
    tokens.push buffered if buffered
    tokens

generateJSONSchema = (input)->
    ret = {}
    level = -1
    objectStack = [{}]
    for i in [0...input.length]
        token = input[i]
        switch token
            when ":indent"
                indent = input[i+1]
                key = input[i+3]
                if indent > level
                    objectStack.push {}
                    objectStack[objectStack.length - 2].properties ?= {}
                    objectStack[objectStack.length - 2].type ?= "object"
                    objectStack[objectStack.length - 2].properties[key] = objectStack[objectStack.length - 1]
                    i += 4
                else if indent is level
                    objectStack[objectStack.length - 1] = {}
                    objectStack[objectStack.length - 2].properties[key] = objectStack[objectStack.length - 1]
                    objectStack[objectStack.length - 2].properties[key] = objectStack[objectStack.length - 1]
                    i += 4
                else if indent < level
                    for i in [0..(level - indent)]
                        objectStack.pop()
                level = indent
            when "str"
                node = objectStack[objectStack.length - 1]
                node.type = "string"
                if "{" is input[i+1]
                    match input, i+1,
                        ["{", "$min", ",", "$max", "}"], (min, max)->
                            node.minLength = min
                            node.maxLength = max
                            i += 5
                        ["{", "$min", ",", "}"], (min)->
                            node.minLength = min
                            i += 4
                        ["{", ",", "$max", "}"], (max)->
                            node.maxLength = max
                            i += 4
                        ["{", "$max", "}"], (max)->
                            node.maxLength = max
                            i += 3
                        -> throw Error "incorrect str format"
            when "int"
                node = objectStack[objectStack.length - 1]
                node.type = "number"
                node.multipleOf = 1
                if "{" is input[i+1]
                    match input, i+1,
                        ["{", "$min", ",", "$max", "}"], (min, max)->
                            node.minimum = min
                            node.maximum = max
                            i += 5
                        ["{", "$min", ",", "}"], (min)->
                            node.minimum = min
                            i += 4
                        ["{", ",", "$max", "}"], (max)->
                            node.maximum = max
                            i += 4
                        ["{", "$max", "}"], (max)->
                            node.maximum = max
                            i += 3
                        -> throw Error "incorrect str format"
            when ":key"
                "pass"
    objectStack[0].properties

module.exports =
    parse: parse = (input)-> generateJSONSchema parseYAML input
    loads: (file)->
        new Promise (resolve, reject)->
            fs.readFile file, (err, content)->
                if err then reject err else resolve parse content
    ParseError: ParseError
