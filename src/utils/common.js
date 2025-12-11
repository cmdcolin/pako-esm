function _has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

export function assign(obj /*from1, from2, from3, ...*/) {
  var sources = Array.prototype.slice.call(arguments, 1)
  while (sources.length) {
    var source = sources.shift()
    if (!source) {
      continue
    }

    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object')
    }

    for (var p in source) {
      if (_has(source, p)) {
        obj[p] = source[p]
      }
    }
  }

  return obj
}

export function shrinkBuf(buf, size) {
  if (buf.length === size) {
    return buf
  }
  return buf.subarray(0, size)
}

export function arraySet(dest, src, src_offs, len, dest_offs) {
  dest.set(src.subarray(src_offs, src_offs + len), dest_offs)
}

export function flattenChunks(chunks) {
  if (chunks.length === 0) {
    return new Uint8Array(0)
  }
  if (chunks.length === 1) {
    return chunks[0]
  }

  var i, l, len, pos, chunk, result

  len = 0
  for (i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length
  }

  result = new Uint8Array(len)
  pos = 0
  for (i = 0, l = chunks.length; i < l; i++) {
    chunk = chunks[i]
    result.set(chunk, pos)
    pos += chunk.length
  }

  return result
}

export function Buf8(size) {
  return new Uint8Array(size)
}

export function Buf16(size) {
  return new Uint16Array(size)
}

export function Buf32(size) {
  return new Int32Array(size)
}
