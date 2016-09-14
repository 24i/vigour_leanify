'use strict'

const test = require('tape')
const leanify = require('../lib/index')

test('Pass through', function (t) {
  const css = 'body { background: white }'

  var buffer = ''
  leanify('test.css')
    .on('data', d => { buffer += d })
    .on('end', function () {
      t.equal(buffer, css, 'css is not changed')
      t.end()
    })
    .end(css)
})

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

test('undefined optimization', function (t) {
  const oldCode = 'if (undefined) {\n  console.log(42);\n} else {\n  console.log(24);\n}'
  const newCode = '{\n  console.log(24);\n}'

  var buffer = ''
  leanify('test.js')
    .on('data', d => { buffer += d })
    .on('end', function () {
      t.equal(buffer, newCode, 'if removed, else used')
      t.end()
    })
    .end(oldCode)
})

test('literal optimization', function (t) {
  const oldCode = 'if (42 === 24) {\n  console.log(42);\n} else {\n  console.log(24);\n}'
  const newCode = '{\n  console.log(24);\n}'

  var buffer = ''
  leanify('test.js')
    .on('data', d => { buffer += d })
    .on('end', function () {
      t.equal(buffer, newCode, 'if removed, else used')
      t.end()
    })
    .end(oldCode)
})

test('identifier optimization', function (t) {
  const oldCode = 'const testVar = 5;\nif (testVar === \'dumb\') {\n  console.log(testVar);\n}'
  const newCode = 'const testVar = 5;'

  var buffer = ''
  leanify('test.js')
    .on('data', d => { buffer += d })
    .on('end', function () {
      t.equal(buffer, newCode, 'if removed')
      t.end()
    })
    .end(oldCode)
})

test('member optimization', function (t) {
  const oldCode = 'const c1 = { arr: [\'dumb\'] };\nconst c2 = c1.arr;\nif (c2[0] != \'not dumb\') {\n  console.log(c1);\n} else {\n  console.log(c2);\n}'
  const newCode = 'const c1 = { arr: [\'dumb\'] };\nconst c2 = c1.arr;\n{\n  console.log(c1);\n}'

  var buffer = ''
  leanify('test.js')
    .on('data', d => { buffer += d })
    .on('end', function () {
      t.equal(buffer, newCode, 'else removed')
      t.end()
    })
    .end(oldCode)
})

test('operators', function (t) {
  const oldCode = 'const c1 = { key: 42 };\nconst c2 = { key: c1.key + 1 };\nif (c2.key > c1.key && -c2.key < 24) {\n  console.log(c1);\n} else {\n  console.log(c2);\n}'
  const newCode = 'const c1 = { key: 42 };\nconst c2 = { key: c1.key + 1 };\n{\n  console.log(c1);\n}'

  var buffer = ''
  leanify('test.js')
    .on('data', d => { buffer += d })
    .on('end', function () {
      t.equal(buffer, newCode, 'else removed')
      t.end()
    })
    .end(oldCode)
})
