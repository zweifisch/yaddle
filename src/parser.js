import {char, str, re, or, map, seq, maybe, skip, many, sep, decl, alphaNum, letter, oneplus, repeat, some, done, run, anno} from "mattone";
import {Tokenizer, indent} from "./tokenizer";

const always = x => _ => x;

const tokval = tok=> tok.value;
const constant = s=> map(some(({value, type})=> value === s && type === "NAME"), tokval);
const t = tp => x => x.type === tp;
const op = s=> map(some(({value, type})=> value === s && type === "OP"), tokval);

const append = ([head, tail])=> tail ? head.concat([tail]) : head;

const strip = (str)=> str.substr(1, str.length - 2);

const tee = (f) => (x)=> {
    f(x);
    return x;
};

export const pp = (tag)=> (x) => console.log(tag, JSON.stringify(x, null, 2));

export const tokenizer = new Tokenizer([
    ['NAME', /[A-Za-z_][A-Za-z_0-9-]*/],
    ['REGEXP', /\/.*\//],
    ['STRING', /"((\\")|[^"])*"/],
    ['OP', /([{}\[\]?$:,|@%!/&]|\.{3})/],
    ['NUMBER', /-?(0|[1-9]\d*)(\.\d+)?/],
    ['COMMENT', /#.*/],
    ['NL', /[\r\n]+([ \t]+[\r\n]+)*/],
    ['SPACE', /[ \t]+/]]);


function list2dict(key_optional_vals) {
    let required = [];
    let kvs = new Map();
    let definitions = new Map();
    let sealed = true;
    let refid = null;
    let refDeclaration = new Map();
    for (let [key, optional, val] of key_optional_vals) {
        if (key === "@")
            definitions.set(optional, val);
        else if (optional === "open")
            sealed = false;
        else if (optional === "id")
            refid = val;
        else if (optional === "extref")
            refDeclaration.set(key, val);
        else {
            if (!optional)
                required.push(key);
            kvs.set(key, val);
        }
    }
    return [kvs, required, sealed, definitions, refid, refDeclaration];
}


export function getParser() {
    let name = map(some(t('NAME')), tokval);
    let rawString = map(some(t('STRING')), tokval, strip);

    let num = map(some(t("NUMBER")), tokval, parseFloat);
    let _true = map(constant("true"), always(true));
    let _false = map(constant("false"), always(false));
    let _null = map(constant("null"), always(null));

    let enumItem = or(num, _true, _false, _null, name, rawString);
    let _enum = anno("enum", sep(skip(op("|")), enumItem));

    let boolean = anno("boolean", map(constant("bool"), always(null)));
    let null_ = anno("null", map(constant("null"), always(null)));

    let numRange = seq(skip(op('{')),
                       maybe(num), skip(op(",")), maybe(num),
                       skip(op('}')));

    let regexp = map(some(t("REGEXP")), tokval, strip);
    let string = anno("string", or(seq(skip(constant("str")), maybe(numRange), maybe(regexp)),
                                   seq(maybe(numRange), regexp)));
    let format = anno("format", seq(skip(op("%")), name));

    let numRangeStep = seq(skip(op("{")),
                           maybe(num), skip(op(",")), maybe(num),
                           maybe(seq(skip(op(",")), num)),
                           skip(op('}')));

    let number = anno("number", seq(skip(constant("num")), maybe(numRangeStep)));
    let integer = anno("integer", seq(skip(constant("int")), maybe(numRangeStep)));

    let schema = decl();
    let array = anno("array", seq(skip(op("[")),
                                  maybe(sep(skip(op(",")), schema)),
                                  skip(op("]")),
                                  maybe(numRange),
                                  maybe(op("!"))));
    let _indent = anno("indent", map(some(t("INDENT")), tokval));
    let _dedent = some(t("DEDENT"), tokval);
    let nl = some(t("NL"));
    let definition = seq(op("@"), name);
    let key = seq(or(seq(or(name, string), maybe(op("?"))),
                     definition),
                  skip(op(":")));

    let ref = anno("ref", seq(skip(op("@")), or(name,
                                                seq(name, skip(op(":")), name))));
    let refDeclaration = map(seq(skip(op("@")), name, rawString),
                             ([name, url])=> [name, "extref", url]);

    let baseSchema = or(ref, string, number, integer, boolean, null_, format, array);

    let oneof = anno("oneof", map(seq(oneplus(seq(baseSchema, skip(op("|")))),
                        baseSchema), append));
    let allof = anno("allof", map(seq(oneplus(seq(baseSchema, skip(op("&")))),
                        baseSchema), append));
    let anyof = anno("anyof", map(seq(oneplus(seq(baseSchema, skip(op("/")))),
                        baseSchema), append));

    let simpleSchema = or(anyof, oneof, allof, baseSchema, _enum);

    let dots = map(op("..."), always([null, "open", null]));
    let refid = map(seq(skip(op("@")), rawString), x=> [null, "id", x]);

    let object = decl();
    let nestedObject = seq(skip(nl), skip(_indent), object, skip(_dedent));
    object.define(anno("object",
                       map(oneplus(or(map(seq(key,
                                              or(seq(simpleSchema, skip(nl)),
                                                 nestedObject)), append),
                                      seq(or(dots, refid, refDeclaration), skip(nl)))),
                           list2dict)));

    schema.define(or(object, simpleSchema));

    return seq(skip(maybe(nl)), schema, skip(maybe(nl)), skip(done));
}

const parser = getParser();

export function parse(input) {
    return run(parser, [...indent(tokenizer.tokenize(input + "\n"))]);
}
