'use strict'

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

import { assert } from 'vitest'

import * as pako from '../src/main'

// Load fixtures to test
// return: { 'filename1': content1, 'filename2': content2, ...}
//
function loadSamples(subdir) {
  var result = {}
  var dir = path.join(__dirname, 'fixtures', subdir || 'samples')

  fs.readdirSync(dir)
    .sort()
    .forEach(function (sample) {
      var filepath = path.join(dir, sample),
        extname = path.extname(filepath),
        basename = path.basename(filepath, extname),
        content = new Uint8Array(fs.readFileSync(filepath))

      if (basename[0] === '_') {
        return
      } // skip files with name, started with dash

      result[basename] = content
    })

  return result
}

// Compare 2 buffers (can be Array, Uint8Array, Buffer).
//
function cmpBuf(a, b) {
  if (a.length !== b.length) {
    return false
  }

  for (var i = 0, l = a.length; i < l; i++) {
    if (a[i] !== b[i]) {
      console.log(
        'pos: ' + i + ' - ' + a[i].toString(16) + '/' + b[i].toString(16),
      )
      return false
    }
  }

  return true
}

function testInflate(samples, inflateOptions, deflateOptions) {
  var name, data, deflated, inflated

  for (name in samples) {
    if (!samples.hasOwnProperty(name)) continue
    data = samples[name]

    // Convert dictionary to Buffer if it's a string (node's zlib requires Buffer)
    var zlibOptions = deflateOptions ? { ...deflateOptions } : {}
    if (zlibOptions.dictionary && typeof zlibOptions.dictionary === 'string') {
      zlibOptions.dictionary = Buffer.from(zlibOptions.dictionary)
    }

    // Convert dictionary to Uint8Array for pako (we removed string support)
    var pakoOptions = inflateOptions ? { ...inflateOptions } : {}
    if (pakoOptions.dictionary && typeof pakoOptions.dictionary === 'string') {
      pakoOptions.dictionary = new Uint8Array(
        Buffer.from(pakoOptions.dictionary),
      )
    }

    // Use node's zlib to create deflated data
    // Choose appropriate zlib method based on options
    if (deflateOptions && deflateOptions.raw) {
      deflated = new Uint8Array(
        zlib.deflateRawSync(Buffer.from(data), zlibOptions),
      )
    } else if (deflateOptions && deflateOptions.gzip) {
      deflated = new Uint8Array(zlib.gzipSync(Buffer.from(data), zlibOptions))
    } else {
      deflated = new Uint8Array(
        zlib.deflateSync(Buffer.from(data), zlibOptions),
      )
    }

    inflated = pako.inflate(deflated, pakoOptions)
    assert.deepEqual(inflated, data)
  }
}

export { cmpBuf, loadSamples, testInflate }
