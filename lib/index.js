'use strict'

const path = require('path')
const through = require('through2')
const esprima = require('esprima')
const esmangle = require('esmangle')
const escodegen = require('escodegen')

module.exports = function (file) {
  return path.extname(file) !== '.js' ? through() : through((buf, enc, next) => {
    var code = buf.toString('utf8')

    try {
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

      code = escodegen.generate(optimizedAst, {
        format: { indent: { style: '  ' }, quotes: 'auto' }
      })
    } catch (error) {
      console.log('Error at file:', file)
      console.log('Error:', error)
      if (error) {
        console.log('Stack:', error.stack)
      }
    }

    next(null, code)
  })
}
