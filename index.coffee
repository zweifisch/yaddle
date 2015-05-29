
keywords =
    str: yes
    int: yes
    num: yes
    null: yes
    bool: yes

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

parse = (input)->

    ret = {}

    indenting = no
    indent =
        with: ""
        count: 0
    lastlineIndent = 0
    curlineIndent = 0

    prev = null

    lineno = 0
    pos = 0

    buffered = ""

    skip = no

    tokens = []

    cbracketOpen = no
    sbracketOpen = no
    orOpen = no
    quoteOpen = no
    optionalKey = no

    startNewline = yes

    collectToken = ->
        if trimed = buffered.trimRight()
            tokens.push trimed
        buffered = ""
        skip = yes

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
                collectToken()
                if orOpen
                    orOpen = no
                    tokens.push ":or-close"
            when " "
                if pos is 1
                    if indent.with
                        throw ParseError "mixed indentation", lineno, pos unless indent.with is " "
                    else
                        indent.with = " "
                    switch prev
                        when null then throw ParseError "unexpected indentation", lineno, pos
                    indenting = yes
                skip = not indenting and not buffered and not quoteOpen
            when "\t"
                if pos is 1
                    if indent.with
                        throw ParseError "mixed indentation", lineno, pos unless indent.with is "\t"
                    else
                        indent.with = "\t"
                    switch prev
                        when null then throw ParseError "unexpected indentation", lineno, pos
                    indenting = yes
            when "$"
                tokens.push "$"
                buffered = ""
                skip = yes
            when "?"
                throw ParseError "unexpected ?", lineno, pos if optionalKey
                optionalKey = yes
                skip = yes
            when ":"
                if optionalKey
                    optionalKey = no
                    tokens.push ":key-opt"
                else
                    tokens.push ":key"
                collectToken()
            when "{"
                throw ParseError "unexpected type '#{buffered}'", lineno, pos unless keywords[buffered]
                collectToken()
                tokens.push "{"
                cbracketOpen = yes
            when "}"
                if not cbracketOpen
                    throw ParseError "unexpected }", lineno, pos
                cbracketOpen = no
                collectToken()
                tokens.push "}"
            when ","
                if not cbracketOpen and not sbracketOpen
                    throw ParseError "unexpected ,", lineno, pos
                collectToken()
                if cbracketOpen
                    tokens.push ","
                if orOpen
                    orOpen = no
                    tokens.push ":or-close"
            when "["
                if sbracketOpen
                    throw ParseError "unexpected [", lineno, pos
                collectToken()
                tokens.push "["
                sbracketOpen = yes
            when "]"
                if not sbracketOpen
                    throw ParseError "unexpected ]", lineno, pos
                sbracketOpen = no
                collectToken()
                if orOpen
                    orOpen = no
                    tokens.push ":or-close"
                tokens.push "]"
            when "|"
                throw ParseError "unexpected |", lineno, pos unless buffered
                if not orOpen
                    orOpen = true
                    tokens.push ":or"
                collectToken()
            when "\""
                throw ParseError "unexpected \"", lineno, pos if buffered and not quoteOpen
                quoteOpen = not quoteOpen
                if not quoteOpen
                    tokens.push buffered
                    buffered = ""
                skip = yes
            when "\r"
                skip = yes
            else
                if indenting
                    indenting = no
                    if indent.count
                        throw ParseError "bad indentation", lineno, pos if buffered.length % indent.count
                    else
                        indent.count = buffered.length
                    curlineIndent = buffered.length / indent.count
                    if curlineIndent > lastlineIndent + 1
                        throw ParseError "over indented", lineno, pos
                    tokens.push ":indent"
                    tokens.push curlineIndent
                    buffered = ""
                if pos is 1
                    tokens.push ":indent"
                    tokens.push 0

        if skip
            skip = no
        else
            buffered += cur
        prev = cur
    collectToken()
    tokens

generateJSONSchema = (input)->
    ret = {}
    level = -1
    objectStack = [{}]

    getLast = ->
        node = objectStack[objectStack.length - 1]
        if Array.isArray node
            node.push {}
            node = node[node.length - 1]
        node

    for i in [0...input.length]
        token = input[i]
        switch token
            when ":indent"
                indent = input[++i]
                if indent > level
                    objectStack[objectStack.length - 1].properties ?= {}
                    objectStack[objectStack.length - 1].type = "object"
                    objectStack[objectStack.length - 1].additionalProperties = no
                else if indent is level
                    if Array.isArray objectStack[objectStack.length - 1]
                        objectStack.pop()
                    objectStack.pop()
                else if indent < level
                    for i in [0..(level - indent)]
                        objectStack.pop()
                level = indent
            when ":key", ":key-opt"
                key = input[++i]
                node = {}
                objectStack[objectStack.length - 1].properties[key] = node
                objectStack[objectStack.length - 1].required ?= []
                objectStack[objectStack.length - 1].required.push key if token isnt ":key-opt"
                objectStack.push node
            when "str"
                node = getLast()
                node.type = "string"
                if "{" is input[i+1]
                    match input, i+1,
                        ["{", "$min", ",", "$max", "}"], (min, max)->
                            node.minLength = +min
                            node.maxLength = +max
                            i += 5
                        ["{", "$min", ",", "}"], (min)->
                            node.minLength = +min
                            i += 4
                        ["{", ",", "$max", "}"], (max)->
                            node.maxLength = +max
                            i += 4
                        ["{", "$max", "}"], (max)->
                            node.maxLength = +max
                            i += 3
                        -> throw Error "incorrect str format"
            when "int", "num"
                node = getLast()
                node.type = "number"
                node.multipleOf = 1 if token is "int"
                if "{" is input[i+1]
                    match input, i+1,
                        ["{", "$min", ",", "$max", "}"], (min, max)->
                            node.minimum = if token is "int" then +min else parseFloat min
                            node.maximum = if token is "int" then +max else parseFloat max
                            i += 5
                        ["{", "$min", ",", "}"], (min)->
                            node.minimum = if token is "int" then +min else parseFloat min
                            i += 4
                        ["{", ",", "$max", "}"], (max)->
                            node.maximum = if token is "int" then +max else parseFloat max
                            i += 4
                        ["{", "$max", "}"], (max)->
                            node.maximum = if token is "int" then +max else parseFloat max
                            i += 3
                        -> throw Error "incorrect str format"
            when "null"
                node = getLast()
                node.type = "null"
            when "bool"
                node = getLast()
                node.type = "boolean"
            when "["
                items = []
                while input[++i] isnt "]"
                    items.push input[i]
                node = getLast()
                node.type = "array"
                objectStack.push []
                node.items = anyOf: objectStack[objectStack.length - 1] 
            when ":or"
                items = []
                while input[++i] isnt ":or-close"
                    items.push input[i]
                node = getLast()
                node.enum = items
            when "$"
                lookup = input[++i]
                throw Error "$#{lookup} not defined" unless lookup of objectStack[0].properties
                node = getLast()
                schema = objectStack[0].properties[lookup]
                for key,val of schema
                    node[key] = val
    objectStack[0]

module.exports =
    parse: parse
    load: load = (input)-> generateJSONSchema(parse input)
    loads: (file)->
        new Promise (resolve, reject)->
            fs.readFile file, (err, content)->
                if err then reject err else resolve load content
    ParseError: ParseError
