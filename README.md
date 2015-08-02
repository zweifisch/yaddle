# yaddle

[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]

Yet Another Data format Description LanguagE

```yaml
@role: admin | author | collaborator | "role with space"

user:
  name: str{3,20}
  age: int{10,200}
  gender: male | female
  roles: [@role]
  description?: str{,200}
```

translate to json-schema

```javascript
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "minLength": 3,
          "maxLength": 20
        },
        "age": {
          "type": "integer",
          "minimum": 10,
          "maximum": 200
        },
        "gender": {
          "enum": [
            "male",
            "female"
          ]
        },
        "roles": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/role"
          }
        },
        "description": {
          "type": "string",
          "maxLength": 200
        }
      },
      "required": [
        "name",
        "age",
        "gender",
        "roles"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "user"
  ],
  "additionalProperties": false,
  "definitions": {
    "role": {
      "enum": [
        "admin",
        "author",
        "collaborator",
        "role with space"
      ]
    }
  }
}
```

## api

```js
require("babel/polyfill");
var yaddle = require("yaddle");
yaddle.load("some.ydl").then(...);

yaddle.loads(schema).then(...);
```

## more details

see [yaddle-py](https://github.com/zweifisch/yaddle-py#more-details)

[npm-image]: https://img.shields.io/npm/v/yaddle.svg?style=flat
[npm-url]: https://npmjs.org/package/yaddle
[travis-image]: https://img.shields.io/travis/zweifisch/yaddle.svg?style=flat
[travis-url]: https://travis-ci.org/zweifisch/yaddle
