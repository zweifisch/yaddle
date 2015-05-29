// Generated by CoffeeScript 1.9.2
(function() {
  var ParseError, generateJSONSchema, keywords, load, match, matchArray, parse,
    slice = [].slice;

  keywords = {
    str: true,
    int: true,
    num: true,
    "null": true,
    bool: true
  };

  matchArray = function(input, pattern, shift) {
    var idx, j, len, p, ret;
    if (shift == null) {
      shift = 0;
    }
    ret = [];
    for (idx = j = 0, len = pattern.length; j < len; idx = ++j) {
      p = pattern[idx];
      if ("string" === typeof p && "$" === p.charAt(0)) {
        ret.push(input[idx + shift]);
      } else {
        if (p !== input[idx + shift]) {
          return;
        }
      }
    }
    return ret;
  };

  match = function() {
    var args, failed, i, input, j, ref, shift, values;
    input = arguments[0], shift = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
    failed = args.length % 2 ? args.pop() : void 0;
    for (i = j = 0, ref = args.length / 2; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      if (values = matchArray(input, args[i + i], shift)) {
        return args[i + i + 1].apply(args, values);
      }
    }
    if (failed) {
      return failed();
    }
  };

  ParseError = function(message, lineno, pos) {
    return message + " at " + lineno + ":" + pos;
  };

  parse = function(input) {
    var buffered, cbracketOpen, collectToken, cur, curlineIndent, i, indent, indenting, j, lastlineIndent, lineno, optionalKey, orOpen, pos, prev, quoteOpen, ref, ret, sbracketOpen, skip, startNewline, tokens;
    ret = {};
    indenting = false;
    indent = {
      "with": "",
      count: 0
    };
    lastlineIndent = 0;
    curlineIndent = 0;
    prev = null;
    lineno = 0;
    pos = 0;
    buffered = "";
    skip = false;
    tokens = [];
    cbracketOpen = false;
    sbracketOpen = false;
    orOpen = false;
    quoteOpen = false;
    optionalKey = false;
    startNewline = true;
    collectToken = function() {
      var trimed;
      if (trimed = buffered.trimRight()) {
        tokens.push(trimed);
      }
      buffered = "";
      return skip = true;
    };
    for (i = j = 0, ref = input.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      cur = input.charAt(i);
      if (startNewline) {
        startNewline = false;
        lastlineIndent = curlineIndent;
        indenting = false;
        buffered = "";
        lineno += 1;
        pos = 1;
      } else {
        pos += 1;
      }
      switch (cur) {
        case "\n":
          startNewline = true;
          lastlineIndent = curlineIndent;
          collectToken();
          if (orOpen) {
            orOpen = false;
            tokens.push(":or-close");
          }
          break;
        case " ":
          if (pos === 1) {
            if (indent["with"]) {
              if (indent["with"] !== " ") {
                throw ParseError("mixed indentation", lineno, pos);
              }
            } else {
              indent["with"] = " ";
            }
            switch (prev) {
              case null:
                throw ParseError("unexpected indentation", lineno, pos);
            }
            indenting = true;
          }
          skip = !indenting && !buffered && !quoteOpen;
          break;
        case "\t":
          if (pos === 1) {
            if (indent["with"]) {
              if (indent["with"] !== "\t") {
                throw ParseError("mixed indentation", lineno, pos);
              }
            } else {
              indent["with"] = "\t";
            }
            switch (prev) {
              case null:
                throw ParseError("unexpected indentation", lineno, pos);
            }
            indenting = true;
          }
          break;
        case "$":
          tokens.push("$");
          buffered = "";
          skip = true;
          break;
        case "?":
          if (optionalKey) {
            throw ParseError("unexpected ?", lineno, pos);
          }
          optionalKey = true;
          skip = true;
          break;
        case ":":
          if (optionalKey) {
            optionalKey = false;
            tokens.push(":key-opt");
          } else {
            tokens.push(":key");
          }
          collectToken();
          break;
        case "{":
          if (!keywords[buffered]) {
            throw ParseError("unexpected type '" + buffered + "'", lineno, pos);
          }
          collectToken();
          tokens.push("{");
          cbracketOpen = true;
          break;
        case "}":
          if (!cbracketOpen) {
            throw ParseError("unexpected }", lineno, pos);
          }
          cbracketOpen = false;
          collectToken();
          tokens.push("}");
          break;
        case ",":
          if (!cbracketOpen && !sbracketOpen) {
            throw ParseError("unexpected ,", lineno, pos);
          }
          collectToken();
          if (cbracketOpen) {
            tokens.push(",");
          }
          if (orOpen) {
            orOpen = false;
            tokens.push(":or-close");
          }
          break;
        case "[":
          if (sbracketOpen) {
            throw ParseError("unexpected [", lineno, pos);
          }
          collectToken();
          tokens.push("[");
          sbracketOpen = true;
          break;
        case "]":
          if (!sbracketOpen) {
            throw ParseError("unexpected ]", lineno, pos);
          }
          sbracketOpen = false;
          collectToken();
          if (orOpen) {
            orOpen = false;
            tokens.push(":or-close");
          }
          tokens.push("]");
          break;
        case "|":
          if (!buffered) {
            throw ParseError("unexpected |", lineno, pos);
          }
          if (!orOpen) {
            orOpen = true;
            tokens.push(":or");
          }
          collectToken();
          break;
        case "\"":
          if (buffered && !quoteOpen) {
            throw ParseError("unexpected \"", lineno, pos);
          }
          quoteOpen = !quoteOpen;
          if (!quoteOpen) {
            tokens.push(buffered);
            buffered = "";
          }
          skip = true;
          break;
        case "\r":
          skip = true;
          break;
        default:
          if (indenting) {
            indenting = false;
            if (indent.count) {
              if (buffered.length % indent.count) {
                throw ParseError("bad indentation", lineno, pos);
              }
            } else {
              indent.count = buffered.length;
            }
            curlineIndent = buffered.length / indent.count;
            if (curlineIndent > lastlineIndent + 1) {
              throw ParseError("over indented", lineno, pos);
            }
            tokens.push(":indent");
            tokens.push(curlineIndent);
            buffered = "";
          }
          if (pos === 1) {
            tokens.push(":indent");
            tokens.push(0);
          }
      }
      if (skip) {
        skip = false;
      } else {
        buffered += cur;
      }
      prev = cur;
    }
    collectToken();
    return tokens;
  };

  generateJSONSchema = function(input) {
    var base, base1, getLast, i, indent, items, j, k, key, level, lookup, node, objectStack, ref, ref1, ret, schema, token, val;
    ret = {};
    level = -1;
    objectStack = [{}];
    getLast = function() {
      var node;
      node = objectStack[objectStack.length - 1];
      if (Array.isArray(node)) {
        node.push({});
        node = node[node.length - 1];
      }
      return node;
    };
    for (i = j = 0, ref = input.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      token = input[i];
      switch (token) {
        case ":indent":
          indent = input[++i];
          if (indent > level) {
            if ((base = objectStack[objectStack.length - 1]).properties == null) {
              base.properties = {};
            }
            objectStack[objectStack.length - 1].type = "object";
            objectStack[objectStack.length - 1].additionalProperties = false;
          } else if (indent === level) {
            if (Array.isArray(objectStack[objectStack.length - 1])) {
              objectStack.pop();
            }
            objectStack.pop();
          } else if (indent < level) {
            for (i = k = 0, ref1 = level - indent; 0 <= ref1 ? k <= ref1 : k >= ref1; i = 0 <= ref1 ? ++k : --k) {
              objectStack.pop();
            }
          }
          level = indent;
          break;
        case ":key":
        case ":key-opt":
          key = input[++i];
          node = {};
          objectStack[objectStack.length - 1].properties[key] = node;
          if ((base1 = objectStack[objectStack.length - 1]).required == null) {
            base1.required = [];
          }
          if (token !== ":key-opt") {
            objectStack[objectStack.length - 1].required.push(key);
          }
          objectStack.push(node);
          break;
        case "str":
          node = getLast();
          node.type = "string";
          if ("{" === input[i + 1]) {
            match(input, i + 1, ["{", "$min", ",", "$max", "}"], function(min, max) {
              node.minLength = +min;
              node.maxLength = +max;
              return i += 5;
            }, ["{", "$min", ",", "}"], function(min) {
              node.minLength = +min;
              return i += 4;
            }, ["{", ",", "$max", "}"], function(max) {
              node.maxLength = +max;
              return i += 4;
            }, ["{", "$max", "}"], function(max) {
              node.maxLength = +max;
              return i += 3;
            }, function() {
              throw Error("incorrect str format");
            });
          }
          break;
        case "int":
        case "num":
          node = getLast();
          node.type = "number";
          if (token === "int") {
            node.multipleOf = 1;
          }
          if ("{" === input[i + 1]) {
            match(input, i + 1, ["{", "$min", ",", "$max", "}"], function(min, max) {
              node.minimum = token === "int" ? +min : parseFloat(min);
              node.maximum = token === "int" ? +max : parseFloat(max);
              return i += 5;
            }, ["{", "$min", ",", "}"], function(min) {
              node.minimum = token === "int" ? +min : parseFloat(min);
              return i += 4;
            }, ["{", ",", "$max", "}"], function(max) {
              node.maximum = token === "int" ? +max : parseFloat(max);
              return i += 4;
            }, ["{", "$max", "}"], function(max) {
              node.maximum = token === "int" ? +max : parseFloat(max);
              return i += 3;
            }, function() {
              throw Error("incorrect str format");
            });
          }
          break;
        case "null":
          node = getLast();
          node.type = "null";
          break;
        case "bool":
          node = getLast();
          node.type = "boolean";
          break;
        case "[":
          items = [];
          while (input[++i] !== "]") {
            items.push(input[i]);
          }
          node = getLast();
          node.type = "array";
          objectStack.push([]);
          node.items = {
            anyOf: objectStack[objectStack.length - 1]
          };
          break;
        case ":or":
          items = [];
          while (input[++i] !== ":or-close") {
            items.push(input[i]);
          }
          node = getLast();
          node["enum"] = items;
          break;
        case "$":
          lookup = input[++i];
          if (!(lookup in objectStack[0].properties)) {
            throw Error("$" + lookup + " not defined");
          }
          node = getLast();
          schema = objectStack[0].properties[lookup];
          for (key in schema) {
            val = schema[key];
            node[key] = val;
          }
      }
    }
    return objectStack[0];
  };

  module.exports = {
    parse: parse,
    load: load = function(input) {
      return generateJSONSchema(parse(input));
    },
    loads: function(file) {
      return new Promise(function(resolve, reject) {
        return require("fs").readFile(file, {
          encoding: "utf8"
        }, function(err, content) {
          if (err) {
            return reject(err);
          } else {
            return resolve(load(content));
          }
        });
      });
    },
    ParseError: ParseError
  };

}).call(this);
