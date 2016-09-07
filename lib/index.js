'use strict'

const path = require('path')
const through = require('through2')
const esprima = require('esprima')
const escope = require('escope')
const estraverse = require('estraverse')
const escodegen = require('escodegen')

const mangle = require('./mangle')

module.exports = function (file) {
  return path.extname(file) !== '.js' ? through() : through((buf, enc, next) => {
    var code = buf.toString('utf8')

    try {
      const ast = esprima.parse(code, { raw: true, loc: true })

      const scopeManager = escope.analyze(ast)
      var currentScope = scopeManager.acquire(ast)

      estraverse.replace(ast, {
        enter (node) {
          if (/Function/.test(node.type)) {
            currentScope = scopeManager.acquire(node)
          } else if (node.type === 'IfStatement') {
            var resolved = new Map()

            currentScope.variables.forEach(variable => {
              variable.defs.forEach(def => {
                if (def.kind === 'const') {
                  mangle.setPath(def.node, resolved)
                }
              })
            })

            const binary = mangle.solveBinary(node.test, resolved)

            if (binary !== null) {
              console.log('leanify optimizing file', file)
              console.log('at location:', node.loc)
              if (!!binary === true) {
                console.log('drop alternate')
                return node.consequent
              } else if (!!binary === false) {
                console.log('drop consequent')
                return node.alternate || this.remove()
              }
            }
          }
        }
      })

      code = escodegen.generate(ast, {
        format: { indent: { style: '  ' }, quotes: 'auto' }
      })
    } catch (error) {
      console.log('Leanify error at file:', file)
      console.log('Error:', error)
      if (error) {
        console.log('Stack:', error.stack)
      }
    }

    next(null, code)
  })
}
