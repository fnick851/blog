---
title: Notes for JavaScript
date: 2020-04-03 19:38:40
---

**A way to think about a JavaScript universe.**

## Value Rules

1. Everything is a value.

2. Primitive values are immutable. There is only one value in the universe for each primitive value.

   > Primitive values:
   >
   > - Undefined
   > - Null
   > - Boolean
   > - Number
   >   - Special numbers: `NaN`, `Infinity`, `-Infinity`, `-0`
   > - String
   > - Symbol
   > - BigInt

3. Non-primitive values are mutable. A new value is created for each object literal or function expression evaluation.

   > Non-primitive values:
   >
   > - Function
   > - Object

4. A variable or a property of object points to a value. Equality means they point to the same value.

## Equality Rules

`Object.is(a, b)` is called "same value equality". It can compare two objects or not. It is the same as `a === b` except for:
```javascript
Object.is(NaN, NaN) // true
NaN === NaN; // false (historical reason)

Object.is(0, -0) // false;
0 === -0 // true
```

## The `null` Type

```javascript
// null has a typeof 'object' (this is a historical bug in JavaScript)
typeof null === "object";
```

## Semicolon Rule

> Add a leading semicolon when a line starts with one of the following:
>
> > \+ - / [ (
>
> In practice:
>
> > [ (
