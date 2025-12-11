// String encode/decode helpers

import { Buf8, shrinkBuf } from './common.ts'

// Quick check if we can use fast array to bin string conversion
//
// - apply(Array) can fail on Android 2.2
// - apply(Uint8Array) can fail on iOS 5.1 Safari
let strApplyOK: () => boolean = function () {
  let result = true
  try {
    String.fromCharCode.apply(null, [0])
  } catch (_) {
    result = false
  }

  strApplyOK = () => result
  return result
}

let strApplyUintOK: () => boolean = function () {
  let result = true
  try {
    String.fromCharCode.apply(null, new Uint8Array(1) as unknown as number[])
  } catch (_) {
    result = false
  }

  strApplyUintOK = () => result
  return result
}

let utf8len: (c: number) => number = function (c) {
  // Table with utf8 lengths (calculated by first byte of sequence)
  // Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
  // because max possible codepoint is 0x10ffff
  const table = Buf8(256)
  for (let q = 0; q < 256; q++) {
    table[q] =
      q >= 252
        ? 6
        : q >= 248
          ? 5
          : q >= 240
            ? 4
            : q >= 224
              ? 3
              : q >= 192
                ? 2
                : 1
  }
  table[254] = table[254]! // Invalid sequence start (keep as is)
  table[254] = 1

  utf8len = arg => table[arg]!
  return table[c]!
}

// convert string to array (typed, when possible)
export function string2buf(str: string) {
  const str_len = str.length
  let buf_len = 0

  // count binary size
  for (let m_pos = 0; m_pos < str_len; m_pos++) {
    let c = str.charCodeAt(m_pos)
    if ((c & 0xfc00) === 0xd800 && m_pos + 1 < str_len) {
      const c2 = str.charCodeAt(m_pos + 1)
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00)
        m_pos++
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4
  }

  // allocate buffer
  const buf = new Uint8Array(buf_len)

  // convert
  for (let i = 0, m_pos = 0; i < buf_len; m_pos++) {
    let c = str.charCodeAt(m_pos)
    if ((c & 0xfc00) === 0xd800 && m_pos + 1 < str_len) {
      const c2 = str.charCodeAt(m_pos + 1)
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00)
        m_pos++
      }
    }
    if (c < 0x80) {
      /* one byte */
      buf[i++] = c
    } else if (c < 0x800) {
      /* two bytes */
      buf[i++] = 0xc0 | (c >>> 6)
      buf[i++] = 0x80 | (c & 0x3f)
    } else if (c < 0x10000) {
      /* three bytes */
      buf[i++] = 0xe0 | (c >>> 12)
      buf[i++] = 0x80 | ((c >>> 6) & 0x3f)
      buf[i++] = 0x80 | (c & 0x3f)
    } else {
      /* four bytes */
      buf[i++] = 0xf0 | (c >>> 18)
      buf[i++] = 0x80 | ((c >>> 12) & 0x3f)
      buf[i++] = 0x80 | ((c >>> 6) & 0x3f)
      buf[i++] = 0x80 | (c & 0x3f)
    }
  }

  return buf
}

// Helper (used in 2 places)
function _buf2binstring(buf: Uint8Array | number[], len: number) {
  // On Chrome, the arguments in a function call that are allowed is `65534`.
  // If the length of the buffer is smaller than that, we can use this optimization,
  // otherwise we will take a slower path.
  if (len < 65534) {
    if (
      ('subarray' in buf && strApplyUintOK()) ||
      (!('subarray' in buf) && strApplyOK())
    ) {
      return String.fromCharCode.apply(
        null,
        shrinkBuf(buf as Uint8Array, len) as unknown as number[],
      )
    }
  }

  let result = ''
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]!)
  }
  return result
}

// Convert byte array to binary string
export function buf2binstring(buf: Uint8Array) {
  return _buf2binstring(buf, buf.length)
}

// Convert binary string (typed, when possible)
export function binstring2buf(str: string) {
  const buf = new Uint8Array(str.length)
  for (let i = 0, len = buf.length; i < len; i++) {
    buf[i] = str.charCodeAt(i)
  }
  return buf
}

// convert array to string
export function buf2string(buf: Uint8Array, max?: number) {
  const len = max || buf.length

  // Reserve max possible length (2 words per char)
  // NB: by unknown reasons, Array is significantly faster for
  //     String.fromCharCode.apply than Uint16Array.
  const utf16buf: number[] = new Array(len * 2)

  let out = 0
  let i = 0
  while (i < len) {
    let c = buf[i++]!
    // quick process ascii
    if (c < 0x80) {
      utf16buf[out++] = c
      continue
    }

    let c_len = utf8len(c)
    // skip 5 & 6 byte codes
    if (c_len > 4) {
      utf16buf[out++] = 0xfffd
      i += c_len - 1
      continue
    }

    // apply mask on first byte
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07
    // join the rest
    while (c_len > 1 && i < len) {
      c = (c << 6) | (buf[i++]! & 0x3f)
      c_len--
    }

    // terminated by end of string?
    if (c_len > 1) {
      utf16buf[out++] = 0xfffd
      continue
    }

    if (c < 0x10000) {
      utf16buf[out++] = c
    } else {
      c -= 0x10000
      utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff)
      utf16buf[out++] = 0xdc00 | (c & 0x3ff)
    }
  }

  return _buf2binstring(utf16buf as unknown as Uint8Array, out)
}

// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
export function utf8border(buf: Uint8Array, max?: number) {
  let effectiveMax = max ?? buf.length
  if (effectiveMax > buf.length) {
    effectiveMax = buf.length
  }

  // go back from last position, until start of sequence found
  let pos = effectiveMax - 1
  while (pos >= 0 && (buf[pos]! & 0xc0) === 0x80) {
    pos--
  }

  // Very small and broken sequence,
  // return max, because we should return something anyway.
  if (pos < 0) {
    return effectiveMax
  }

  // If we came to start of buffer - that means buffer is too small,
  // return max too.
  if (pos === 0) {
    return effectiveMax
  }

  return pos + utf8len(buf[pos]!) > effectiveMax ? pos : effectiveMax
}
