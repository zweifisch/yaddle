
keywords =
    str: yes
    int: yes
    num: yes

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
            when " "
                if pos is 1
                    if indent.with
                        throw ParseError "mixed indentation", lineno, pos unless indent.with is " "
                    else
                        indent.with = " "
                    switch prev
                        when null then throw ParseError "unexpected indentation", lineno, pos
                    indenting = yes
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
                "pass"
            when "\r" then null
            else
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

        buffered += cur
        prev = cur
    ret

parseYaddle = (input)-> input

module.exports =
    parse: parse = (input)-> parseYaddle parseYAML input
    loads: (file)->
        new Promise (resolve, reject)->
            fs.readFile file, (err, content)->
                if err then reject err else resolve parse content
    ParseError: ParseError
            

    
