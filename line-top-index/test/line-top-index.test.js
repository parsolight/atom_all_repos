import Random from 'random-seed'
import LinearLineTopIndex from './helpers/linear-line-top-index'
import LineTopIndex from '../src/line-top-index'

let idCounter

describe('LineTopIndex', () => {
  it('supports using object as block ids', function () {
    const id1 = {}
    const id2 = {}
    let index = new LineTopIndex({defaultLineHeight: 1, maxRow: 100})
    index.insertBlock(id1, 2, 4, false)
    index.insertBlock(id2, 4, 7, true)
    assert.equal(index.pixelPositionAfterBlocksForRow(2), 6)
    assert.equal(index.pixelPositionAfterBlocksForRow(4), 8)
    assert.equal(index.pixelPositionBeforeBlocksForRow(5), 16)

    index.removeBlock(id1)
    assert.equal(index.pixelPositionAfterBlocksForRow(2), 2)
    assert.equal(index.pixelPositionAfterBlocksForRow(4), 4)
    assert.equal(index.pixelPositionBeforeBlocksForRow(5), 12)

    index.resizeBlock(id2, 8)
    assert.equal(index.pixelPositionAfterBlocksForRow(2), 2)
    assert.equal(index.pixelPositionAfterBlocksForRow(4), 4)
    assert.equal(index.pixelPositionBeforeBlocksForRow(5), 13)

    index.moveBlock(id2, 2)
    assert.equal(index.pixelPositionBeforeBlocksForRow(3), 11)
    assert.equal(index.pixelPositionAfterBlocksForRow(4), 12)
    assert.equal(index.pixelPositionBeforeBlocksForRow(5), 13)
  })

  it('determines line heights correctly after randomized insertions, removals, and splices', function () {
    this.timeout(Infinity)

    for (let i = 0; i < 200; i++) {
      let seed = Date.now()
      let random = new Random(seed)

      let maxRow = random.intBetween(10, 50)
      let defaultLineHeight = 10
      let referenceIndex = new LinearLineTopIndex({defaultLineHeight, maxRow})
      let actualIndex = new LineTopIndex({seed, defaultLineHeight, maxRow})
      idCounter = 1

      for (let j = 0; j < 50; j++) {
        let k = random(10)
        if (k < 3) {
          performInsertion(random, actualIndex, referenceIndex)
        } else if (k < 5) {
          performRemoval(random, actualIndex, referenceIndex)
        } else if (k < 6) {
          performResize(random, actualIndex, referenceIndex)
        } else if (k < 7) {
          performMove(random, actualIndex, referenceIndex)
        } else {
          performSplice(random, actualIndex, referenceIndex)
        }

        // document.write('<hr>')
        // document.write(actualIndex.toHTML())
        // document.write('<hr>')
        verifyIndex(random, actualIndex, referenceIndex, `Seed: ${seed}`)
      }
    }
  })
})

function verifyIndex (random, actualIndex, referenceIndex, message) {
  let lastReferenceBlock = referenceIndex.getLastBlock() || {row: 0}
  for (let row = 0; row <= lastReferenceBlock.row + 5; row++) {
    let rowPixelPosition = referenceIndex.pixelPositionAfterBlocksForRow(row)
    let firstBlockPixelPosition = referenceIndex.pixelPositionBeforeBlocksForRow(row)
    let nextRowPixelPosition = referenceIndex.pixelPositionAfterBlocksForRow(row + 1)
    let betweenRowsPixelPosition = random.intBetween(rowPixelPosition, nextRowPixelPosition)

    // console.log(row);
    assert.equal(actualIndex.pixelPositionAfterBlocksForRow(row), rowPixelPosition, message)
    assert.equal(actualIndex.pixelPositionBeforeBlocksForRow(row), firstBlockPixelPosition, message)
    assert.equal(actualIndex.rowForPixelPosition(betweenRowsPixelPosition), referenceIndex.rowForPixelPosition(betweenRowsPixelPosition), message)
  }
}

function performInsertion (random, actualIndex, referenceIndex) {
  let start = random(100)
  let height = random(100 + 1)
  let id = idCounter++
  let isAfterRow = Boolean(random(2))

  // document.write(`<div>performInsertion(${id}, ${start}, ${height}, ${isAfterRow})</div>`)

  referenceIndex.insertBlock(id, start, height, isAfterRow)
  actualIndex.insertBlock(id, start, height, isAfterRow)
}

function performRemoval (random, actualIndex, referenceIndex) {
  if (referenceIndex.allBlocks().length === 0) return

  let id = getRandomBlockId(random, referenceIndex)

  // document.write(`<div>performRemoval(${id})</div>`)

  referenceIndex.removeBlock(id)
  actualIndex.removeBlock(id)
}

function performMove (random, actualIndex, referenceIndex) {
  if (referenceIndex.allBlocks().length === 0) return

  let id = getRandomBlockId(random, referenceIndex)
  let newRow = random(100)

  // document.write(`<div>performMove(${id}, ${newRow})</div>`)

  referenceIndex.moveBlock(id, newRow)
  actualIndex.moveBlock(id, newRow)
}

function performResize (random, actualIndex, referenceIndex) {
  if (referenceIndex.allBlocks().length === 0) return

  let id = getRandomBlockId(random, referenceIndex)
  let newHeight = random(100 + 1)

  // document.write(`<div>performResize(${id}, ${newHeight})</div>`)

  referenceIndex.resizeBlock(id, newHeight)
  actualIndex.resizeBlock(id, newHeight)
}

function performSplice (random, actualIndex, referenceIndex) {
  let start = random(100)
  let oldExtent = 0
  while (random(2) > 0) oldExtent += random(5)
  let newExtent = 0
  while (random(2) > 0) newExtent += random(5)

  // document.write(`<div>performSplice(${start}, ${oldExtent}, ${newExtent})</div>`)

  let referenceTouchedBlocks = referenceIndex.splice(start, oldExtent, newExtent)
  let actualTouchedBlocks = actualIndex.splice(start, oldExtent, newExtent)

  referenceTouchedBlocks.forEach(id => assert.equal(actualTouchedBlocks.has(id), true))
  actualTouchedBlocks.forEach(id => assert.equal(referenceTouchedBlocks.has(id), true))
}

function getRandomBlockId (random, referenceIndex) {
  let blocks = referenceIndex.allBlocks()
  let block = blocks[random(blocks.length)]
  return block.id
}
