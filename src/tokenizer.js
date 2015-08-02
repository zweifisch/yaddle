
export class Tokenizer {
    constructor (rules) {
        this.rules = rules.map(([type, re])=> [type, new RegExp("^"+re.source)]);
    }
    *tokenize (input) {
        let row = 1;
        let col = 1;
        let pos = 0;
        let left = input;
        while (left) {
            let match;
            for (let [type, re] of this.rules) {
                match = re.exec(left);
                if (match) {
                    pos += match[0].length;
                    let start = [row, col];
                    let value = match[0];
                    for (let char of value) {
                        if (char === "\n") {
                            row += 1;
                            col = 0;
                        } else {
                            col += 1;
                        }
                    }
                    let end = [row, col > 0 ? col - 1 : 0];
                    yield {type, value, start, end};
                    left = input.substr(pos);
                    break;
                }
            }
            if (match === null) {
                throw new Error(`can't tokenize "${left.substr(0, 50)}"`);
            }
        }
    }
};

function count(string, substr) {
    return string.startsWith(substr) ? 1 + count(string.substr(substr.length), substr) : 0;
};

// add indent/dedent and remove comments
export function *indent (tokens) {
    let newline = false;
    let level = 0;
    let indentWith = null;
    for (let token of tokens) {
        if (token.type === "COMMENT")
            continue;
        if (token.type === "NL") {
            newline = true;
            yield token;
        } else {
            if (newline) {
                newline = false;
                if (token.type === "SPACE") {
                    if (!indentWith)
                        indentWith = token.value;
                    let indentLevel = count(token.value, indentWith);
                    if (indentLevel * indentWith.length !== token.value.length)
                        throw new Error(`Bad indentation at ${token.start[0]},${token.start[1]}`);
                    if (indentLevel > level)
                        for (let l = 0; l < indentLevel - level; l++)
                            yield {type: "INDENT", value: indentWith};
                    else if (indentLevel < level)
                        for (let l = 0; l < level - indentLevel; l++)
                            yield {type: "DEDENT", value: ''};
                    level = indentLevel;
                } else {
                    for (let l = 0; l < level; l ++)
                        yield {type: "DEDENT", value: ''};
                    level = 0;
                    yield token;
                }
            } else if (token.type !== "SPACE") {
                yield token;
            }
        }
    }
    for (let l = 0; l < level; l++)
        yield {type: "DEDENT", value: ''};
}
