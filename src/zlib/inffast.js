// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// See state defs from inflate.js
var BAD = 30 /* got a data error -- remain here until reset */
var TYPE = 12 /* i: waiting for type bits, including last-flag bit */

// Pre-computed bit masks to avoid repeated (1 << n) - 1 calculations
// This is a significant micro-optimization for the hot path
var MASKS = new Uint32Array([
  0x0000, 0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
  0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff,
])

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */
export default function inflate_fast(strm, start) {
  var _in /* local strm.input */
  var last /* have enough input while in < last */
  var _out /* local strm.output */
  var beg /* inflate()'s initial strm.output */
  var end /* while out < end, enough space available */
  //#ifdef INFLATE_STRICT
  var dmax /* maximum distance from zlib header */
  //#endif
  var wsize /* window size or zero if not using window */
  var whave /* valid bytes in the window */
  var wnext /* window write index */
  // Use `s_window` instead `window`, avoid conflict with instrumentation tools
  var s_window /* allocated sliding window, if wsize != 0 */
  var hold /* local strm.hold */
  var bits /* local strm.bits */
  var lcode /* local strm.lencode */
  var dcode /* local strm.distcode */
  var lmask /* mask for first level of length codes */
  var dmask /* mask for first level of distance codes */
  var here /* retrieved table entry */
  var op /* code bits, operation, extra bits, or */
  /*  window position, window bytes to copy */
  var len /* match length, unused bytes */
  var dist /* match distance */
  var from /* where to copy match from */
  var from_source

  var input, output // JS specific, because we have no pointers

  /* copy state to local variables */
  var state = strm.state
  _in = strm.next_in
  input = strm.input
  last = _in + (strm.avail_in - 5)
  _out = strm.next_out
  output = strm.output
  beg = _out - (start - strm.avail_out)
  end = _out + (strm.avail_out - 257)
  //#ifdef INFLATE_STRICT
  dmax = state.dmax
  //#endif
  wsize = state.wsize
  whave = state.whave
  wnext = state.wnext
  s_window = state.window
  hold = state.hold
  bits = state.bits
  lcode = state.lencode
  dcode = state.distcode
  lmask = MASKS[state.lenbits]
  dmask = MASKS[state.distbits]

  /* decode literals and length/distances until end-of-block or not enough
     input data or output space */

  top: do {
    // Ensure at least 15 bits in the accumulator for code lookup
    // Unrolled: always load 2 bytes when bits < 15
    if (bits < 15) {
      hold += input[_in++] << bits
      bits += 8
      hold += input[_in++] << bits
      bits += 8
    }

    here = lcode[hold & lmask]

    dolen: for (;;) {
      op = here >>> 24
      hold >>>= op
      bits -= op
      op = (here >>> 16) & 0xff

      // Fast path: literal byte (most common case in many data types)
      if (op === 0) {
        output[_out++] = here & 0xffff
        continue top
      }

      // Length code (second most common)
      if (op & 16) {
        len = here & 0xffff
        op &= 15
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits
            bits += 8
          }
          len += hold & MASKS[op]
          hold >>>= op
          bits -= op
        }

        // Load bits for distance code
        if (bits < 15) {
          hold += input[_in++] << bits
          bits += 8
          hold += input[_in++] << bits
          bits += 8
        }

        here = dcode[hold & dmask]

        dodist: for (;;) {
          op = here >>> 24
          hold >>>= op
          bits -= op
          op = (here >>> 16) & 0xff

          if (op & 16) {
            dist = here & 0xffff
            op &= 15
            if (bits < op) {
              hold += input[_in++] << bits
              bits += 8
              if (bits < op) {
                hold += input[_in++] << bits
                bits += 8
              }
            }
            dist += hold & MASKS[op]
            //#ifdef INFLATE_STRICT
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back'
              state.mode = BAD
              break top
            }
            //#endif
            hold >>>= op
            bits -= op

            op = _out - beg /* max distance in output */
            if (dist > op) {
              /* see if copy from window */
              op = dist - op /* distance back in window */
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back'
                  state.mode = BAD
                  break top
                }
              }
              from = 0 // window index
              from_source = s_window
              if (wnext === 0) {
                /* very common case */
                from += wsize - op
                if (op < len) {
                  len -= op
                  // Copy from window with unrolling
                  do {
                    output[_out++] = s_window[from++]
                  } while (--op)
                  from = _out - dist
                  from_source = output
                }
              } else if (wnext < op) {
                /* wrap around window */
                from += wsize + wnext - op
                op -= wnext
                if (op < len) {
                  len -= op
                  do {
                    output[_out++] = s_window[from++]
                  } while (--op)
                  from = 0
                  if (wnext < len) {
                    op = wnext
                    len -= op
                    do {
                      output[_out++] = s_window[from++]
                    } while (--op)
                    from = _out - dist
                    from_source = output
                  }
                }
              } else {
                /* contiguous in window */
                from += wnext - op
                if (op < len) {
                  len -= op
                  do {
                    output[_out++] = s_window[from++]
                  } while (--op)
                  from = _out - dist
                  from_source = output
                }
              }
              // Optimized copy: unroll by 8 when possible
              while (len > 7) {
                output[_out++] = from_source[from++]
                output[_out++] = from_source[from++]
                output[_out++] = from_source[from++]
                output[_out++] = from_source[from++]
                output[_out++] = from_source[from++]
                output[_out++] = from_source[from++]
                output[_out++] = from_source[from++]
                output[_out++] = from_source[from++]
                len -= 8
              }
              // Handle remainder
              while (len > 0) {
                output[_out++] = from_source[from++]
                len--
              }
            } else {
              // Copy from output buffer (no window needed)
              from = _out - dist

              // Unroll by 8 for longer matches
              while (len > 7) {
                output[_out++] = output[from++]
                output[_out++] = output[from++]
                output[_out++] = output[from++]
                output[_out++] = output[from++]
                output[_out++] = output[from++]
                output[_out++] = output[from++]
                output[_out++] = output[from++]
                output[_out++] = output[from++]
                len -= 8
              }
              // Handle remainder
              while (len > 0) {
                output[_out++] = output[from++]
                len--
              }
            }
            break // exit dodist loop
          }

          if ((op & 64) === 0) {
            /* 2nd level distance code */
            here = dcode[(here & 0xffff) + (hold & MASKS[op])]
            continue dodist
          }

          strm.msg = 'invalid distance code'
          state.mode = BAD
          break top
        }
        continue top
      }

      if ((op & 64) === 0) {
        /* 2nd level length code */
        here = lcode[(here & 0xffff) + (hold & MASKS[op])]
        continue dolen
      }

      if (op & 32) {
        /* end-of-block */
        state.mode = TYPE
        break top
      }

      strm.msg = 'invalid literal/length code'
      state.mode = BAD
      break top
    }
  } while (_in < last && _out < end)

  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
  len = bits >> 3
  _in -= len
  bits -= len << 3
  hold &= MASKS[bits]

  /* update state and return */
  strm.next_in = _in
  strm.next_out = _out
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last)
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end)
  state.hold = hold
  state.bits = bits
  return
}
