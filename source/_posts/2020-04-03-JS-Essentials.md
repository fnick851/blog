---
title: "JS Essentials"
date: 2020-04-03 19:38:40
---

**Probably the missing pieces you need in order to write correct JavaScript programs:**

1

Everything is a value.

2

Primitive values are immutable. There is only one distinct value for each primitive value.  
Non-primitive values are mutable. A new value is created for each object literal or function expression evaluation.

3

A variable or a property of object points to a value. Equality means they point to the same value.

4

```javascript
// NaN is not equal to NaN
NaN !== NaN;
// 0 is a different value from -0
Object.is(0, -0) === false;
// -0 is equal to 0
0 === -0;
-0 === 0;
```

5

```javascript
// null has a typeof 'object'
typeof null === "object";
```