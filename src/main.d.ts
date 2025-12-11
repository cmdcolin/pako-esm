// Type definitions for pako 1.0
// Project: https://github.com/nodeca/pako
// Definitions by: Denis Cappellin <https://github.com/cappellin>
//                 Caleb Eggensperger <https://github.com/calebegg>
//                 Muhammet Öztürk <https://github.com/hlthi>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

export enum FlushValues {
  Z_NO_FLUSH = 0,
  Z_PARTIAL_FLUSH = 1,
  Z_SYNC_FLUSH = 2,
  Z_FULL_FLUSH = 3,
  Z_FINISH = 4,
  Z_BLOCK = 5,
  Z_TREES = 6,
}

export enum StrategyValues {
  Z_FILTERED = 1,
  Z_HUFFMAN_ONLY = 2,
  Z_RLE = 3,
  Z_FIXED = 4,
  Z_DEFAULT_STRATEGY = 0,
}

export enum ReturnCodes {
  Z_OK = 0,
  Z_STREAM_END = 1,
  Z_NEED_DICT = 2,
  Z_ERRNO = -1,
  Z_STREAM_ERROR = -2,
  Z_DATA_ERROR = -3,
  Z_BUF_ERROR = -5,
}

export interface InflateOptions {
  windowBits?: number
  dictionary?: Uint8Array | ArrayBuffer
  raw?: boolean
  chunkSize?: number
  skipCrcCheck?: boolean
}

export interface InflateFunctionOptions {
  windowBits?: number
  raw?: boolean
  skipCrcCheck?: boolean
}

export type Data = Uint8Array | ArrayBuffer

/**
 * Decompress data with inflate/ungzip and options. Autodetect format via wrapper header
 * by default. That's why we don't provide separate ungzip method.
 */
export function inflate(data: Data, options?: InflateFunctionOptions): Uint8Array

/**
 * The same as inflate, but creates raw data, without wrapper (header and adler32 crc).
 */
export function inflateRaw(data: Data, options?: InflateFunctionOptions): Uint8Array

/**
 * Just shortcut to inflate, because it autodetects format by header.content. Done for convenience.
 */
export function ungzip(data: Data, options?: InflateFunctionOptions): Uint8Array

export class Inflate {
  constructor(options?: InflateOptions)
  err: ReturnCodes
  msg: string
  result: Uint8Array
  strm: {
    next_in: number
    avail_in: number
    next_out: number
    avail_out: number
  }
  onData(chunk: Uint8Array): void
  onEnd(status: number): void
  push(data: Data, mode?: FlushValues | boolean): boolean
  reset(): void
}

export interface DecompressBlockResult {
  data: Uint8Array
  bytesRead: number
  nextBlockOffset: number
  hasMore: boolean
}

export interface DecompressedBlock {
  data: Uint8Array
  compressedOffset: number
  compressedSize: number
}

/**
 * Helper class for efficiently decompressing multiple gzip members (BGZF blocks).
 */
export class MultiMemberGzip {
  constructor()
  /**
   * Decompress a single gzip block starting at offset.
   * Returns the decompressed data and the offset of the next block.
   */
  decompressBlock(input: Uint8Array, offset?: number): DecompressBlockResult
  /**
   * Decompress all gzip members in the input buffer.
   * Returns concatenated decompressed data.
   */
  decompressAll(input: Uint8Array): Uint8Array
  /**
   * Decompress all blocks and return them as separate arrays with position info.
   * Useful for BGZF virtual offset tracking.
   */
  decompressAllBlocks(input: Uint8Array): DecompressedBlock[]
}

// Re-export constants
export const Z_NO_FLUSH: number
export const Z_PARTIAL_FLUSH: number
export const Z_SYNC_FLUSH: number
export const Z_FULL_FLUSH: number
export const Z_FINISH: number
export const Z_BLOCK: number
export const Z_TREES: number
export const Z_OK: number
export const Z_STREAM_END: number
export const Z_NEED_DICT: number
export const Z_ERRNO: number
export const Z_STREAM_ERROR: number
export const Z_DATA_ERROR: number
export const Z_BUF_ERROR: number
export const Z_DEFAULT_COMPRESSION: number
export const Z_FILTERED: number
export const Z_HUFFMAN_ONLY: number
export const Z_RLE: number
export const Z_FIXED: number
export const Z_DEFAULT_STRATEGY: number
export const Z_BINARY: number
export const Z_TEXT: number
export const Z_UNKNOWN: number
export const Z_DEFLATED: number
