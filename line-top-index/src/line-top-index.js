import Random from 'random-seed'
import Iterator from './iterator'
import {add as addLogicalPositions, subtract as subtractLogicalPositions} from './logical-position-helpers'

export default class LineTopIndex {
  constructor (params = {}) {
    this.setDefaultLineHeight(params.defaultLineHeight || 0)
    this.randomGenerator = new Random(params.seed || Date.now())
    this.root = null
    this.iterator = this.buildIterator()
    this.blockEndNodesById = new Map()
    this.blockHeightsById = new Map()
    this.followingBlockIds = new Set()
  }

  isEmpty () {
    return this.blockEndNodesById.size === 0
  }

  setDefaultLineHeight (lineHeight) {
    this.defaultLineHeight = lineHeight
  }

  buildIterator () {
    return new Iterator(this)
  }

  insertBlock (id, row, blockHeight, isAfterRow=false) {
    let node = this.iterator.insertNode(row)
    if (node.priority == null) {
      node.priority = this.generateRandom()
      this.bubbleNodeUp(node)
    }

    this.adjustNodeBlockHeight(node, +blockHeight, isAfterRow)

    node.blockIds.add(id)
    this.blockEndNodesById.set(id, node)
    this.blockHeightsById.set(id, blockHeight)
    if (isAfterRow) this.followingBlockIds.add(id)
  }

  removeBlock (id) {
    let node = this.blockEndNodesById.get(id)
    let blockHeight = this.blockHeightsById.get(id)
    let isAfterRow = this.followingBlockIds.has(id)

    this.adjustNodeBlockHeight(node, -blockHeight, isAfterRow)
    node.blockIds.delete(id)
    if (node.blockIds.size === 0) {
      this.deleteNode(node)
    }

    this.blockEndNodesById.delete(id)
    this.blockHeightsById.delete(id)
    this.followingBlockIds.delete(id)
  }

  resizeBlock (id, newBlockHeight) {
    let node = this.blockEndNodesById.get(id)
    let blockHeight = this.blockHeightsById.get(id)
    let delta = newBlockHeight - blockHeight
    let isAfterRow = this.followingBlockIds.has(id)
    this.adjustNodeBlockHeight(node, delta, isAfterRow)
    this.blockHeightsById.set(id, newBlockHeight)
  }

  moveBlock (id, newRow) {
    let blockHeight = this.blockHeightsById.get(id)
    let isAfterRow = this.followingBlockIds.has(id)
    this.removeBlock(id)
    this.insertBlock(id, newRow, blockHeight, isAfterRow)
  }

  splice (start, oldExtent, newExtent) {
    if (this.isEmpty() || (oldExtent === 0 && newExtent === 0)) return new Set()

    let oldEnd = start + oldExtent
    let newEnd = start + newExtent

    let isInsertion = oldExtent === 0
    let startNode = this.iterator.insertNode(start)
    let endNode = this.iterator.insertNode(oldEnd, !isInsertion)

    let touchedBlocks = new Set()
    let blocksIdsToMove = new Set()

    startNode.priority = -1
    this.bubbleNodeUp(startNode)
    endNode.priority = -2
    this.bubbleNodeUp(endNode)

    startNode.blockIds.forEach(id => {
      const blockHeight = this.blockHeightsById.get(id)
      startNode.blockIds.delete(id)
      startNode.blockHeight -= blockHeight
      startNode.distanceFromLeftAncestor.pixels -= blockHeight
      if (this.followingBlockIds.has(id)) startNode.followingBlockHeight -= blockHeight

      blocksIdsToMove.add(id)
    })

    if (startNode.right) {
      this.blockIdsForSubtree(startNode.right).forEach(id => {
        blocksIdsToMove.add(id)
      })

      startNode.right = null
    }

    blocksIdsToMove.forEach(id => {
      const blockHeight = this.blockHeightsById.get(id)
      endNode.blockIds.add(id)
      endNode.blockHeight += blockHeight
      if (this.followingBlockIds.has(id)) endNode.followingBlockHeight += blockHeight
      this.blockEndNodesById.set(id, endNode)
    })

    endNode.distanceFromLeftAncestor.row = newEnd
    endNode.blockIds.forEach(id => touchedBlocks.add(id))

    if (startNode.distanceFromLeftAncestor.row === endNode.distanceFromLeftAncestor.row) {
      endNode.blockIds.forEach(id => {
        const blockHeight = this.blockHeightsById.get(id)
        startNode.blockIds.add(id)
        startNode.blockHeight += blockHeight
        startNode.distanceFromLeftAncestor.pixels += blockHeight
        if (this.followingBlockIds.has(id)) startNode.followingBlockHeight += blockHeight
        this.blockEndNodesById.set(id, startNode)
      })

      this.deleteNode(endNode)
    } else if (endNode.blockIds.size > 0) {
      endNode.priority = this.generateRandom()
      this.bubbleNodeDown(endNode)
    } else {
      this.deleteNode(endNode)
    }

    if (startNode.blockIds.size > 0) {
      startNode.priority = this.generateRandom()
      this.bubbleNodeDown(startNode)
    } else {
      this.deleteNode(startNode)
    }

    return touchedBlocks
  }

  pixelPositionAfterBlocksForRow (row) {
    let pixelPosition = row * this.defaultLineHeight
    if (!this.isEmpty()) {
      pixelPosition += this.iterator.inclusiveTotalBlockPixelsPrecedingRow(row)
    }

    return pixelPosition
  }

  pixelPositionBeforeBlocksForRow (row) {
    let pixelPosition = row * this.defaultLineHeight
    if (!this.isEmpty()) {
      pixelPosition += this.iterator.exclusiveTotalBlockPixelsPrecedingRow(row)
    }

    return pixelPosition
  }

  rowForPixelPosition (pixelPosition) {
    if (this.isEmpty()) {
      return Math.floor(pixelPosition / this.defaultLineHeight)
    } else {
      return this.iterator.rowForPixelPosition(pixelPosition, this.defaultLineHeight)
    }
  }

  deleteNode (node) {
    node.priority = Infinity
    this.bubbleNodeDown(node)
    if (node.parent) {
      if (node.parent.left === node) {
        node.parent.left = null
      } else {
        node.parent.right = null
      }
    } else {
      this.root = null
    }
  }

  bubbleNodeUp (node) {
    while (node.parent && node.priority < node.parent.priority) {
      if (node === node.parent.left) {
        this.rotateNodeRight(node)
      } else {
        this.rotateNodeLeft(node)
      }
    }
  }

  bubbleNodeDown (node) {
    while (true) {
      let leftChildPriority = node.left ? node.left.priority : Infinity
      let rightChildPriority = node.right ? node.right.priority : Infinity

      if (leftChildPriority < rightChildPriority && leftChildPriority < node.priority) {
        this.rotateNodeRight(node.left)
      } else if (rightChildPriority < node.priority) {
        this.rotateNodeLeft(node.right)
      } else {
        break
      }
    }
  }

  rotateNodeLeft (pivot) {
    let root = pivot.parent

    if (root.parent) {
      if (root === root.parent.left) {
        root.parent.left = pivot
      } else {
        root.parent.right = pivot
      }
    } else {
      this.root = pivot
    }
    pivot.parent = root.parent

    root.right = pivot.left
    if (root.right) {
      root.right.parent = root
    }

    pivot.left = root
    pivot.left.parent = pivot

    pivot.distanceFromLeftAncestor = addLogicalPositions(root.distanceFromLeftAncestor, pivot.distanceFromLeftAncestor)
  }

  rotateNodeRight (pivot) {
    let root = pivot.parent

    if (root.parent) {
      if (root === root.parent.left) {
        root.parent.left = pivot
      } else {
        root.parent.right = pivot
      }
    } else {
      this.root = pivot
    }
    pivot.parent = root.parent

    root.left = pivot.right
    if (root.left) {
      root.left.parent = root
    }

    pivot.right = root
    pivot.right.parent = pivot

    root.distanceFromLeftAncestor = subtractLogicalPositions(root.distanceFromLeftAncestor, pivot.distanceFromLeftAncestor)
  }

  adjustNodeBlockHeight (node, delta, isAfterRow) {
    if (isAfterRow) node.followingBlockHeight += delta
    node.blockHeight += delta
    node.distanceFromLeftAncestor.pixels += delta
    while (node.parent) {
      if (node.parent.left === node) {
        node.parent.distanceFromLeftAncestor.pixels += delta
      }
      node = node.parent
    }
  }

  blockIdsForSubtree (node, blockIds = new Set()) {
    node.blockIds.forEach(function (id) {
      blockIds.add(id)
    })
    if (node.left) this.blockIdsForSubtree(node.left, blockIds)
    if (node.right) this.blockIdsForSubtree(node.right, blockIds)

    return blockIds
  }

  generateRandom () {
    return this.randomGenerator.random()
  }
}
