'use strict'

import fs from 'fs'
import path from 'path'

import { assert, describe, it } from 'vitest'

import { cmpBuf as cmp } from './helpers'
import * as pako from '../src/main'

describe('ArrayBuffer', function () {
  var file = path.join(__dirname, 'fixtures/samples/lorem_utf_100k.txt')
  var sample = new Uint8Array(fs.readFileSync(file))
  var deflated = pako.deflate(sample)

  it('Deflate ArrayBuffer', function () {
    assert.ok(cmp(deflated, pako.deflate(sample.buffer)))
  })

  it('Inflate ArrayBuffer', function () {
    assert.ok(cmp(sample, pako.inflate(deflated.buffer)))
  })
})
