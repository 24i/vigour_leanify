'use strict'

const path = require('path')
const through = require('through2')
const esprima = require('esprima')
const esmangle = require('esmangle')
const escodegen = require('escodegen')

module.exports = function (file) {
  return path.extname(file) !== '.js' ? through() : through((buf, enc, next) => {
    const code = buf.toString('utf8')
    const ast = esprima.parse(code, { raw: true, loc: true })

    const pipeline = [[
      'pass/remove-wasted-blocks',
      'pass/transform-branch-to-expression',
      'pass/reduce-branch-jump',
      'pass/reduce-multiple-if-statements',
      'pass/remove-side-effect-free-expressions',
      'pass/remove-context-sensitive-expressions',
      'pass/remove-unreachable-branch'
    ].map(esmangle.pass.require)]
    const optimizedAst = esmangle.optimize(ast, pipeline)

    const optimizedCode = escodegen.generate(optimizedAst, {
      format: { indent: { style: '  ' }, quotes: 'auto' }
    })

    next(null, optimizedCode)
  })
}
