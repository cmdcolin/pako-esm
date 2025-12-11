export type TypedArray = Uint8Array | Uint16Array | Int32Array
export type ArrayLike = TypedArray | number[]

function _has(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

export function assign<T extends object>(obj: T, ...sources: object[]): T {
  for (const source of sources) {
    if (!source) {
      continue
    }

    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object')
    }

    for (const p in source) {
      if (_has(source, p)) {
        ;(obj as Record<string, unknown>)[p] = (
          source as Record<string, unknown>
        )[p]
      }
    }
  }

  return obj
}

// reduce buffer size, avoiding mem copy
export function shrinkBuf(buf: TypedArray, size: number) {
  if (buf.length === size) {
    return buf
  }
  return buf.subarray(0, size)
}

export function arraySet(
  dest: ArrayLike,
  src: ArrayLike,
  src_offs: number,
  len: number,
  dest_offs: number,
) {
  if (
    'subarray' in dest &&
    'subarray' in src &&
    typeof dest.set === 'function'
  ) {
    dest.set(src.subarray(src_offs, src_offs + len), dest_offs)
    return
  }
  // Fallback to ordinary array
  for (let i = 0; i < len; i++) {
    dest[dest_offs + i] = src[src_offs + i]!
  }
}

// Join array of chunks to single array.
export function flattenChunks(chunks: Uint8Array[]) {
  // calculate data length
  let len = 0
  for (const chunk of chunks) {
    len += chunk.length
  }

  // join chunks
  const result = new Uint8Array(len)
  let pos = 0
  for (const chunk of chunks) {
    result.set(chunk, pos)
    pos += chunk.length
  }

  return result
}

export function Buf8(size: number) {
  return new Uint8Array(size)
}

export function Buf16(size: number) {
  return new Uint16Array(size)
}

export function Buf32(size: number) {
  return new Int32Array(size)
}
