'use strict'

import fs from 'fs'
import path from 'path'

import { assert, describe, it } from 'vitest'

import * as pako from '../src/main'
import { Buf8, arraySet } from '../src/utils/common'

describe('Gzip special cases', function () {
  it('Read stream with SYNC marks', function () {
    var inflator,
      strm,
      _in,
      len,
      pos = 0,
      i = 0
    var data = fs.readFileSync(path.join(__dirname, 'fixtures/gzip-joined.gz'))

    do {
      len = data.length - pos
      _in = Buf8(len)
      arraySet(_in, data, pos, len, 0)

      inflator = new pako.Inflate()
      strm = inflator.strm
      inflator.push(_in, true)

      assert(!inflator.err, inflator.msg)

      pos += strm.next_in
      i++
    } while (strm.avail_in)

    assert(i === 2, 'invalid blobs count')
  })
})
