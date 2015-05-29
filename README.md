# yaddle

[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]

Yet Another Data format Description LanguagE

```yaml
role: admin | author | collaborator | role with space

user:
  name: str{3,20}
  age: int{10,200}
  gender: male | female
  roles: [$role]
  description?: str{200}
```

translate to json-schema

```javascript
{
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "maxLength": 20,
            "minLength": 3
        },
        "age": {
            "type": "number",
            "minimum": 10,
            "maximum": 200,
            "multipleOf": 1
        },
        "gender": {
            "enum": ["male", "female"]
        },
        "roles": {
            "type": "array",
            "items": {
                "anyOf": [
                    {
                        "enum": ["admin", "author", "collaborator", "role with space"]
                    }
                ]
            }
        },
        "description": {
            "type": "string",
            "maxLength": 200
        }
    },
    "required": ["name", "age", "gender", "roles"],
    "additionalProperties": false
}
```

## api

```javascript
var yaddle = require("yaddle");
yaddle.loads("some.ydl");
```

## more details(TBD)

### string

```yaml
str{1,} /pattern/
```

```javascript
{
    "type": "string",
    "minLength": 1,
    "pattern": "pattern"
}
```

### array

```yaml
[int, str]{1,10}
```

```javascript
{
    "type": "array",
    "minItems": 1,
    "maxItems": 10,
    "items": {
        anyOf: [
            {
                "type": "number",
                "multipleOf": 1
            },
            {
                "type": "string"
            }
        ]
    }
}
```

### object

```yaml
key: str
*: true
```

```javascript
{
    "type": "object",
    "properties": {
        "key": {
            "type": "string"
        },
        "required": ["key"]
    }
    "additionalProperties": true
}
```

[npm-image]: https://img.shields.io/npm/v/yaddle.svg?style=flat
[npm-url]: https://npmjs.org/package/yaddle
[travis-image]: https://img.shields.io/travis/zweifisch/yaddle.svg?style=flat
[travis-url]: https://travis-ci.org/zweifisch/yaddle
