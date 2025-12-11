'use strict'

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

import { assert, describe, it } from 'vitest'

import { cmpBuf as cmp } from './helpers'
import * as pako from '../src/main'

describe('ArrayBuffer', function () {
  var file = path.join(__dirname, 'fixtures/samples/lorem_utf_100k.txt')
  var sample = new Uint8Array(fs.readFileSync(file))
  var deflated = new Uint8Array(zlib.deflateSync(sample))

  it('Inflate ArrayBuffer', function () {
    assert.ok(cmp(sample, pako.inflate(deflated.buffer)))
  })
})
