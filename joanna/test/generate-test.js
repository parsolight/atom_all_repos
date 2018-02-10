'use strict'

const CoffeeScript = require('coffee-script')
CoffeeScript.register()
const donna = require('donna')
const dedent = require('dedent')
const assert = require('chai').assert
const generate = require('../src/generate')

describe('generate(code)', function () {
  it('handles classes', function () {
    const donnaResult = runDonna(dedent`
      # A person class
      class Person extends Animal
        constructor: (name, age) ->
          @name = name
          @age = age

        # Get the name
        getName: ->
          Promise.resolve(@name)
    `)

    const result = generate(dedent`
      // A person class
      class Person extends Animal {
        constructor (name, age) {
          this.name = name
          this.age = age
        }

        // Get the name
        async getName () {
          return this.name
        }
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 0])

    assert.deepEqual(result.objects['1']['0'], {
      type: 'class',
      name: 'Person',
      superClass: 'Animal',
      doc: 'Private: A person class',
      range: [[1, 0], [11, 1]],
      bindingType: undefined,
      classProperties: [],
      prototypeProperties: [
        [2, 2],
        [8, 2]
      ]
    })

    assert.deepEqual(result.objects['2']['2'], {
      type: 'function',
      name: 'constructor',
      doc: undefined,
      range: [[2, 2], [5, 3]],
      bindingType: 'prototypeProperty',
      paramNames: ['name', 'age']
    })

    assert.deepEqual(result.objects['8']['2'], {
      type: 'function',
      name: 'getName',
      doc: 'Private: Get the name',
      range: [[8, 2], [10, 3]],
      bindingType: 'prototypeProperty',
      paramNames: []
    })
  })

  it('handles named class exports', function () {
    const es6Result = generate(dedent`
      // A person class
      exports.Person = class Person {}
    `)

    const es7Result = generate(dedent`
      // A person class
      export class Person {}
    `)

    assert.equal(es6Result.objects[1][0].doc, "Private: A person class")
    assert.equal(es7Result.objects[1][0].doc, "Private: A person class")
  })

  it('handles section divider comments', function () {
    const donnaResult = runDonna(dedent`
      # A useful class
      class Person
        constructor: (name) ->
          @name = name

        ###
        Section: Getters
        ###

        ###
        Something else
        ###

        # Essential: Get the name
        # Does stuff
        # Returns a string.
        getName: -> @name
    `)

    const result = generate(dedent`
      // A useful class
      class Person {
        constructor (name) {
          this.name = name
        }

        /*
        Section: Getters
        */

        /*
        Something else
        */

        // Essential: Get the name
        // Does stuff
        // Returns a string.
        getName () { return this.name }
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 0])
    assertMatchingObjects(result, donnaResult, [6, 2], [5, 2])
    assertMatchingObjects(result, donnaResult, [10, 2], [9, 2])
  })

  it('handles section divider immediately followed by methods', function () {
    const result = generate(dedent`
      // A useful class
      class Person {
        /*
        Section: construction
        */

        constructor (name) {
          this.name = name
        }
      }
    `)

    assert.deepEqual(result.objects[2][2], {
      type: 'comment',
      doc: 'Section: construction',
      range: [[2, 2], [4, 4]]
    })
  })

  it('handles top-level functions', function () {
    const donnaResult = runDonna(dedent`
      # A useful function
      hello = (one, two) ->
        console.log("hello!")
    `)

    const result = generate(dedent`
      // A useful function
      function hello (one, two) {
        console.log("hello!")
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 8])
  })

  it('handles exported functions', function () {
    const donnaResult = runDonna(dedent`
      # A useful function
      exports.hello = (one, two) ->
        console.log("hello!")
    `)

    const es6Result = generate(dedent`
      // A useful function
      exports.hello = function hello (one, two) {
        console.log("hello!")
      }
    `)

    const es7Result = generate(dedent`
      // A useful function
      export function hello (one, two) {
        console.log("hello!")
      }
    `)

    assertMatchingObjects(es6Result, donnaResult, [1, 0], [1, 0])
    assertMatchingObjects(es7Result, donnaResult, [1, 0], [1, 0])
    assert.equal(es6Result.exports.hello, 1)
    assert.equal(es7Result.exports.hello, 1)
    assert.equal(donnaResult.exports.hello, 1)

    assert.equal(es6Result.objects[1][0].doc, 'Private: A useful function')
    assert.equal(es7Result.objects[1][0].doc, 'Private: A useful function')
  })

  it('handles default-exported classes', function () {
    const donnaResult = runDonna(dedent`
      # A useful class
      module.exports = class Person
        constructor: ->
    `)

    const es6Result = generate(dedent`
      // A useful class
      module.exports = class Person {
        constructor () {}
      }
    `)

    const es7Result = generate(dedent`
      // A useful class
      export default class Person {
        constructor () {}
      }
    `)

    assertMatchingObjects(es6Result, donnaResult, [1, 17], [1, 17])
    assertMatchingObjects(es7Result, donnaResult, [1, 15], [1, 17])
    assert.equal(es6Result.exports, 1)
    assert.equal(es7Result.exports, 1)
    assert.equal(donnaResult.exports, 1)
  })

  it('handles static methods', function () {
    const donnaResult = runDonna(dedent`
      # A useful class
      class Thing

        # A useful factory function
        @build: (id) ->
          return new Thing(id)
    `)

    const result = generate(dedent`
      // A useful class
      class Thing {

        // A useful factory function
        static build (id) {
          return new Thing(id)
        }
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 0])
    assertMatchingObjects(result, donnaResult, [4, 2], [4, 10])
  })

  it('handles public instance properties', function () {
    const result = generate(dedent`
      // Public: A useful class
      class Thing {
        constructor (params) {

          // Public: An instance of A
          this.a = params.a || new A()

          if (params.b) {

            // Public: An instance of B
            this.b = params.b || new B()
          }
        }
      }
    `)

    assert.deepEqual(result.objects['1']['0'], {
      type: 'class',
      name: 'Thing',
      superClass: null,
      doc: 'Public: A useful class',
      range: [[1, 0], [13, 1]],
      bindingType: undefined,
      classProperties: [],
      prototypeProperties: [
        [2, 2],
        [5, 4],
        [10, 6]
      ]
    })

    assert.deepEqual(result.objects['5']['4'], {
      name: 'a',
      doc: 'Public: An instance of A',
      range: [[5, 4], [5, 32]],
      bindingType: 'prototypeProperty',
      type: 'primitive'
    })

    assert.deepEqual(result.objects['10']['6'], {
      name: 'b',
      doc: 'Public: An instance of B',
      range: [[10, 6], [10, 34]],
      bindingType: 'prototypeProperty',
      type: 'primitive'
    })
  })

  it('handles the various visibility levels of APIs', function () {
    const donnaResult = runDonna(dedent`
      # Public: a thing
      class Thing

        # a
        a: -> 'a'

        # Private: b
        b: -> 'b'

        # Public: c
        c: -> 'c'

        # Essential: d
        d: -> 'd'

        # Extended: e
        e: -> 'e'
    `)

    const result = generate(dedent`
      // Public: a thing
      class Thing {

        // a
        a () { return 'a' }

        // Private: b
        b () { return 'b' }

        // Public: c
        c () { return 'c' }

        // Essential: d
        d () { return 'd' }

        // Extended: e
        e () { return 'e' }
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 0])
  })

  it('does not blow up for exported variables', function () {
    generate(dedent`
      // A very important variable
      export let foo = 5;

      // A less important variable
      export const bar = 6;
    `)
  })
})

function assertMatchingObjects (actualMetadata, expectedMetadata,actualPosition, expectedPosition) {
  const actualObjects = actualMetadata.objects
  const expectedObjects = expectedMetadata.objects

  assertMatchingObject(actualPosition, expectedPosition, [])

  function assertMatchingObject (actualPos, expectedPos, keyPath) {
    const actualObject = actualObjects[actualPos[0]][actualPos[1]]
    const expectedObject = expectedObjects[expectedPos[0]][expectedPos[1]]

    assert(expectedObject, 'No expected object at the given position')
    assert(actualObject, 'No actual object at the given position')

    const expectedKeys = Object.keys(expectedObject).sort()

    for (let key of expectedKeys) {
      if (key === 'range') {
        continue
      } else if (key === 'doc') {
        const actualDoc = actualObject.doc && actualObject.doc.trim()
        const expectedDoc = expectedObject.doc && expectedObject.doc.trim()
        assertMatchingProperty(actualDoc, expectedDoc, keyPath.concat([key]))
      } else {
        assertMatchingProperty(actualObject[key], expectedObject[key], keyPath.concat([key]))
      }
    }
  }

  function assertMatchingProperty (actual, expected, keyPath) {
    if (Array.isArray(expected)) {
      assert.equal(actual.length, expected.length, 'Length of key path: ' + keyPath.join('.'))
      for (let i = 0; i < expected.length; i++) {
        let expectedElement = expected[i]
        let actualElement = actual[i]
        if (isPosition(expectedElement)) {
          assertMatchingObject(actualElement, expectedElement, keyPath.concat([i]))
        } else {
          assert.equal(actualElement, expectedElement, 'Key path: ' + keyPath.join('.') + i)
        }
      }
    } else {
      assert.equal(actual, expected, 'Key path: ' + keyPath.join('.'))
    }
  }
}

function isPosition (value) {
  return Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
}

function runDonna (content) {
  const filename = 'test.coffee'
  const parser = new donna.Parser()
  parser.parseContent(content, filename)
  const metadata = new donna.Metadata({}, parser)
  const slug = {files: {}}
  metadata.generate(CoffeeScript.nodes(content))
  donna.populateSlug(slug, filename, metadata)
  return slug.files[filename]
}
