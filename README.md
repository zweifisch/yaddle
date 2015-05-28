# yaddle

Yet Another Data format Description LanguagE

```
arrows:
  - from: str{18}
    to: str{18} /^.*$/
    strength: int{1,17}
    type:
      - "inbound"   # literal
      - "outbound"
name: str{3,20}
description?: str
tags:
  - str{1,20}
location:
  x: 
    - float
    - str{18}
  y:
    - float
    - str{18}
```
