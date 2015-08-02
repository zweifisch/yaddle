
export function generate(node) {
    let [tp, val] = node;
    let ret;
    switch (tp) {
    case "enum":
        return {"enum": val};
    case "string":
        let [nrange, pattern] = val;
        ret = {"type": tp};
        if (nrange !== null) {
            let [nmin, nmax] = nrange;
            if (nmin !== null)
                ret["minLength"] = nmin;
            if (nmax !== null)
                ret["maxLength"] = nmax;
        }
        if (pattern !== null)
            ret["pattern"] = pattern;
        return ret;
    case "number":
    case "integer":
        ret = {"type": tp};
        if (val !== null) {
            let [l, h, step] = val;
            if (l !== null)
                ret["minimum"] = l;
            if (h !== null)
                ret["maximum"] = h;
            if (step !== null)
                ret["multipleOf"] = step;
        }
        return ret;
    case "ref":
        return {"$ref": `#/definitions/${val}`};
    case "array":
        ret = {"type": tp};
        let [items, size_range, unique] = val;
        if (items)
            if (items.length === 1)
                ret["items"] = generate(items[0]);
            else
                ret["items"] = items.map(generate);
        if (size_range) {
            let [l, h] = size_range;
            if (h !== null)
                ret["maxItems"] = h;
            if (l !== null)
                ret["minItems"] = l;
        }
        if (unique)
            ret["uniqueItems"] = true;
        return ret;
    case "object":
        let properties = {};
        let [kvs, required, sealed, definitions, refid, refDeclarations] = val;
        for (let [k, v] of kvs)
            properties[k] = generate(v);
        ret = {"type": "object", "properties": properties};
        if (required)
            ret["required"] = required;
        if (sealed)
            ret["additionalProperties"] = false;
        if (refid)
            ret["id"] = refid;
        if (definitions.size) {
            let defs = {};
            for (let [k, v] of definitions)
                defs[k] = generate(v);
            ret["definitions"] = defs;
        }
        return ret;
    case "anyof":
    case "oneof":
    case "allof":
        ret = {};
        ret[`${tp.substr(0,3)}Of`] = val.map(generate);
        return ret;
    case "format":
        return {"format": val};
    case "boolean":
        return {"type": "boolean"};
    case "null":
        return {"type": "null"};
    }
    return null;
}
