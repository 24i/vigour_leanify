'use strict'

const test = require('tape')
const leanify = require('../lib/index')

test('No optimization', function (t) {
  const code = 'const testVar = 5;\nvar otherVar = 7;\nif (otherVar == \'dumb\') {\n  console.log(otherVar);\n}'

  var buffer = ''

  leanify('test.js')
    .on('data', d => { buffer += d })
    .on('end', function () {
      t.equal(buffer, code, 'code is not changed')
      t.end()
    })
    .end(code)
})

test('identifier optimization', function (t) {
  const oldcode = 'const testVar = 5;\nif (testVar === \'dumb\') {\n  console.log(testVar);\n}'
  const newCode = 'const testVar = 5;'

  var buffer = ''

  leanify('test.js')
    .on('data', d => { buffer += d })
    .on('end', function () {
      t.equal(buffer, newCode, 'if removed')
      t.end()
    })
    .end(oldcode)
})
