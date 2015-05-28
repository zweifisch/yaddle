
parseYAML = (input)->
    indent = ""
    prev = null
    lineno = 1
    charpos = 1
    for i in [0...input.length]
        cur = input.charAt i
        switch cur
            when " "
                switch prev
                    when null then throw Error "unexpected indentation at #{lineno}:#{charpos}"

parseYaddle = (input)->


module.exports =
    parse: parse = (input)-> parseYaddle parseYAML input
    loads: (file)->
        new Promise (resolve, reject)->
            fs.readFile file, (err, content)->
                if err then reject err else resolve parse content
            

    
