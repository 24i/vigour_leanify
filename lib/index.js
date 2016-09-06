'use strict'

const path = require('path')
const through = require('through2')
const esprima = require('esprima')
const escope = require('escope')
const estraverse = require('estraverse')
const escodegen = require('escodegen')

module.exports = function (file) {
  return path.extname(file) !== '.js' ? through() : through((buf, enc, next) => {
    var code = buf.toString('utf8')

    try {
      const ast = esprima.parse(code, { raw: true, loc: true })

      const scopeManager = escope.analyze(ast)
      var currentScope = scopeManager.acquire(ast)

      estraverse.traverse(ast, {
        enter (node, parent) {
          if (/Function/.test(node.type)) {
            currentScope = scopeManager.acquire(node)
          }

          if (node.type === 'IfStatement') {
            var resolved = new Map()

            currentScope.variables.forEach(variable => {
              variable.defs.forEach(def =>  {
                if (def.kind === 'const') {
                  setPath(def.node, resolved)
                }
              })
            })

            console.log(node.loc)
            console.log(resolved)
          }
        },
        leave (node, parent) {
          if (/Function/.test(node.type)) {
            currentScope = currentScope.upper;
          }
        }
      })

      code = escodegen.generate(ast, {
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


function binaryWalk (test) {
  if (test.type === 'BinaryExpression') {
    const left = binaryWalk(test.left)
    const right = binaryWalk(test.right)

    console.log(test.operator)
  } else {
    console.log(test)
  }
}

function setPath (node, resolved, path) {
  if (node.type === 'VariableDeclarator') {
    setPath(node.init, resolved, [node.id.name])
  } else if (node.type === 'AssignmentExpression') {
    setPath(node.right, resolved, path)
  } else if (node.type === 'ObjectExpression') {
    node.properties.forEach(property => {
      setPath(property, resolved, path)
    })
  } else if (node.type === 'Property') {
    if (node.key.type === 'Identifier') {
      setPath(node.value, resolved, path.concat(node.key.name))
    }
    if (node.key.type === 'Literal') {
      setPath(node.value, resolved, path.concat(node.key.value))
    }
  } else if (node.type === 'ArrayExpression') {
    node.elements.forEach((element, index) => {
      setPath(element, resolved, path.concat(index))
    })
  } else if (node.type === 'MemberExpression') {
    const from = getPath(node)
    if (from !== undefined && from.constructor === Array) {
      copyPath(resolved, from, path)
    }
  } else if (node.type === 'Identifier') {
    copyPath(resolved, [node.name], path)
  } else if (node.type === 'Literal') {
    resolved.set(path, node.value)
  }
}

function getPath (member) {
  if (member.type === 'MemberExpression') {
    return [].concat(getPath(member.object)).concat(getPath(member.property))
  } else if (member.type === 'Identifier') {
    return member.name
  } else if (member.type === 'Literal') {
    return member.value
  } else {
    return undefined
  }
}

function copyPath(resolved, from, path) {
  for (let [key, value] of resolved) {
    let partial = key.slice(0, from.length)
    if (JSON.stringify(partial) === JSON.stringify(from)) {
      resolved.set(path.concat(key.slice(from.length)), value)
    }
  }
}
