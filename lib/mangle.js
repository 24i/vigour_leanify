'use strict'

function setPath (node, resolved, path) {
  switch (node.type) {
    case 'VariableDeclarator':
      return setPath(node.init, resolved, [node.id.name])
    case 'AssignmentExpression':
      return setPath(node.right, resolved, path)
    case 'ObjectExpression':
      node.properties.forEach(property => {
        setPath(property, resolved, path)
      })
      return
    case 'Property':
      if (node.key.type === 'Identifier') {
        setPath(node.value, resolved, path.concat(node.key.name))
      } else if (node.key.type === 'Literal') {
        setPath(node.value, resolved, path.concat(node.key.value))
      }
      return
    case 'ArrayExpression':
      node.elements.forEach((element, index) => {
        setPath(element, resolved, path.concat(index))
      })
      return
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'ConditionalExpression':
    case 'UnaryExpression':
      const binary = solveBinary(node, resolved)
      if (binary !== null) {
        resolved.set(path, binary)
      }
      return
    case 'MemberExpression':
      const member = getMember(node, resolved)
      if (member !== null && member.constructor === Array) {
        copyPath(resolved, member, path)
      }
      return
    case 'Identifier':
      return copyPath(resolved, [node.name], path)
    case 'Literal':
      return resolved.set(path, node.value)
  }
}
exports.setPath = setPath

function getMember (node, resolved) {
  switch (node.type) {
    case 'MemberExpression':
      return [].concat(getMember(node.object)).concat(getMember(node.property))
    case 'Identifier':
      return node.name
    case 'Literal':
      return node.value
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'ConditionalExpression':
    case 'UnaryExpression':
      return solveBinary(node, resolved)
    default:
      return null
  }
}

function copyPath (resolved, from, to) {
  for (let [key, value] of resolved) {
    let partial = key.slice(0, from.length)
    if (JSON.stringify(partial) === JSON.stringify(from)) {
      resolved.set(to.concat(key.slice(from.length)), value)
    }
  }
}

function solveBinary (node, resolved) {
  switch (node.type) {
    case 'AssignmentExpression':
      return solveBinary(node.right, resolved)
    case 'ArrayExpression':
      return true
    case 'BinaryExpression':
      return solveLeftRight(node, resolved, doBinary)
    case 'LogicalExpression':
      return solveLeftRight(node, resolved, doLogical)
    case 'ConditionalExpression':
      const test = solveBinary(node.test, resolved)
      if (test === true) {
        return solveBinary(node.consequent, resolved)
      } else if (test === false) {
        return solveBinary(node.alternate, resolved)
      }
      return null
    case 'UnaryExpression':
      const argument = solveBinary(node.argument, resolved)
      return argument === null ? null : doUnary(node.operator, argument)
    case 'MemberExpression':
      const member = getMember(node, resolved)
      if (member !== null && member.constructor === Array) {
        return getPath(resolved, member)
      }
      return null
    case 'Identifier':
      return getPath(resolved, [node.name])
    case 'Literal':
      return node.value
    default:
      return null
  }
}
exports.solveBinary = solveBinary

function solveLeftRight (node, resolved, solver) {
  const left = solveBinary(node.left, resolved)
  const right = solveBinary(node.right, resolved)
  return left === null || right === null ? null : solver(node.operator, left, right)
}

function getPath (resolved, path) {
  for (let [key, value] of resolved) {
    if (JSON.stringify(key) === JSON.stringify(path)) {
      return value
    }
  }

  return null
}

function doBinary (operator, left, right) {
  switch (operator) {
    case '|':
      return left | right
    case '^':
      return left ^ right
    case '&':
      return left & right
    case '==':
      return left == right // eslint-disable-line
    case '!=':
      return left != right // eslint-disable-line
    case '===':
      return left === right
    case '!==':
      return left !== right
    case '<':
      return left < right
    case '>':
      return left > right
    case '<=':
      return left <= right
    case '>=':
      return left >= right
    case '<<':
      return left << right
    case '>>':
      return left >> right
    case '>>>':
      return left >>> right
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      return left / right
    case '%':
      return left % right
    default:
      return null
  }
}

function doLogical (operator, left, right) {
  switch (operator) {
    case '&&':
      return left && right
    case '||':
      return left || right
    default:
      return null
  }
}

function doUnary (operator, argument) {
  switch (operator) {
    case '+':
      return +argument
    case '-':
      return -argument
    case '~':
      return ~argument
    case '!':
      return !argument
    case 'void':
      return undefined
    case 'typeof':
      return typeof argument
    default:
      return null
  }
}
