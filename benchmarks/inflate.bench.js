import { readFileSync } from 'node:fs'

import { bench, describe } from 'vitest'

import { inflate as inflateBranch1 } from '../esm_branch1/main.js'
import { inflate as inflateBranch2 } from '../esm_branch2/main.js'

const branch1Name = readFileSync('esm_branch1/branchname.txt', 'utf8').trim()
const branch2Name = readFileSync('esm_branch2/branchname.txt', 'utf8').trim()

function benchInflate(name, filePath, opts) {
  const compressedData = readFileSync(filePath)

  describe(name, () => {
    bench(
      branch1Name,
      () => {
        inflateBranch1(compressedData)
      },
      opts,
    )

    bench(
      branch2Name,
      () => {
        inflateBranch2(compressedData)
      },
      opts,
    )
  })
}

benchInflate(
  'out.sorted.gff.gz (4MB compressed)',
  'test/data/out.sorted.gff.gz',
  {
    iterations: 10,
    warmupIterations: 1,
  },
)
