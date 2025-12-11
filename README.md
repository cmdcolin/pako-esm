# Pako-ESM2

This is a fork of https://www.npmjs.com/package/@progress/pako-esm which in turn
is a fork of Pako v1.0.11

Notes:

- We use pako v1 because v2 does not work with bgzf
- deflate routines were removed
- Non-typedarray and string routines were removed
- skipCrcCheck flag was added
