---
title: Notes for Rust
date: 2021-07-06 14:13:06
---

## Ownership Rules

1. Each value in Rust has a variable that's called its owner.
2. There can only be one owner at a time.
3. When the owner goes out of scope, the value will be dropped.
