import COMMONMARK_RULES from './commonmark-rules'
import Rules from './rules'
import { escapeMarkdown, extend, resetDescendantTagCache, trimLeadingNewlines, trimTrailingNewlines } from './utilities'
import RootNode from './root-node'
import Node from './node'
export default function TurndownService (options) {
  if (!(this instanceof TurndownService)) return new TurndownService(options)

  const defaults = {
    rules: COMMONMARK_RULES,
    headingStyle: 'setext',
    hr: '* * *',
    bulletListMarker: '*',
    codeBlockStyle: 'indented',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full',
    br: '  ',
    preformattedCode: false,
    blankReplacement: function (content, node) {
      return node.isBlock ? '\n\n' : ''
    },
    keepReplacement: function (content, node) {
      return node.isBlock ? '\n\n' + node.outerHTML + '\n\n' : node.outerHTML
    },
    defaultReplacement: function (content, node) {
      return node.isBlock ? '\n\n' + content + '\n\n' : content
    }
  }
  this.options = extend({}, defaults, options)
  this.rules = new Rules(this.options)
}

TurndownService.prototype = {
  /**
   * The entry point for converting a string or DOM node to Markdown
   * @public
   * @param {String|HTMLElement} input The string or DOM node to convert
   * @returns A Markdown representation of the input
   * @type String
   */

  turndown: function (input) {
    if (!canConvert(input)) {
      throw new TypeError(
        input + ' is not a string, or an element/document/fragment node.'
      )
    }

    if (input === '') return ''

    // RootNode clones DOM inputs, so each conversion has a fresh tree. Keep
    // descendant summaries scoped to that tree and avoid stale results across
    // calls that reuse a subsequently modified DOM input.
    resetDescendantTagCache()
    const output = process.call(this, new RootNode(input, this.options))
    return postProcess.call(this, output)
  },

  /**
   * Add one or more plugins
   * @public
   * @param {Function|Array} plugin The plugin or array of plugins to add
   * @returns The Turndown instance for chaining
   * @type Object
   */

  use: function (plugin) {
    if (Array.isArray(plugin)) {
      for (let i = 0; i < plugin.length; i++) this.use(plugin[i])
    } else if (typeof plugin === 'function') {
      plugin(this)
    } else {
      throw new TypeError('plugin must be a Function or an Array of Functions')
    }
    return this
  },

  /**
   * Adds a rule
   * @public
   * @param {String} key The unique key of the rule
   * @param {Object} rule The rule
   * @returns The Turndown instance for chaining
   * @type Object
   */

  addRule: function (key, rule) {
    this.rules.add(key, rule)
    return this
  },

  /**
   * Keep a node (as HTML) that matches the filter
   * @public
   * @param {String|Array|Function} filter The unique key of the rule
   * @returns The Turndown instance for chaining
   * @type Object
   */

  keep: function (filter) {
    this.rules.keep(filter)
    return this
  },

  /**
   * Remove a node that matches the filter
   * @public
   * @param {String|Array|Function} filter The unique key of the rule
   * @returns The Turndown instance for chaining
   * @type Object
   */

  remove: function (filter) {
    this.rules.remove(filter)
    return this
  },

  /**
   * Escapes Markdown syntax
   * @public
   * @param {String} string The string to escape
   * @returns A string with Markdown syntax escaped
   * @type String
   */

  escape: function (string) {
    return escapeMarkdown(string)
  }
}

/**
 * Reduces a DOM node down to its Markdown string equivalent
 * @private
 * @param {HTMLElement} parentNode The node to convert
 * @returns A Markdown representation of the node
 * @type String
 */

function process (parentNode) {
  const self = this
  const childNodes = parentNode.childNodes
  const childCount = childNodes.length
  if (childCount === 0) return ''

  function replacementForChild (child) {
    const node = new Node(child, self.options)
    if (node.nodeType === 3) return node.isCode ? node.nodeValue : self.escape(node.nodeValue)
    if (node.nodeType === 1) return replacementForNode.call(self, node)
    return ''
  }

  if (childCount === 1) {
    const replacement = replacementForChild(childNodes[0])
    let leadingNewlines = 0
    while (leadingNewlines < replacement.length && replacement.charCodeAt(leadingNewlines) === 10) {
      leadingNewlines++
    }
    const separatorLength = Math.min(2, leadingNewlines)
    return (separatorLength === 1 ? '\n' : separatorLength === 2 ? '\n\n' : '') + replacement.slice(leadingNewlines)
  }

  const chunks = []
  let trailingNewlines = 0
  for (let index = 0; index < childCount; index++) {
    const replacement = replacementForChild(childNodes[index])
    let start = 0
    while (start < replacement.length && replacement.charCodeAt(start) === 10) start++
    let end = replacement.length
    while (end > start && replacement.charCodeAt(end - 1) === 10) end--

    const leadingNewlines = start
    const separatorLength = Math.min(2, Math.max(trailingNewlines, leadingNewlines))

    if (end > start) {
      if (separatorLength) chunks.push(separatorLength === 1 ? '\n' : '\n\n')
      chunks.push(replacement.slice(start, end))
      trailingNewlines = replacement.length - end
    } else {
      // Keep the complete separator pending when replacement is empty or all
      // LFs. A following join trims this tail before choosing its separator.
      trailingNewlines = separatorLength
    }
  }

  if (trailingNewlines) chunks.push('\n'.repeat(trailingNewlines))
  return chunks.join('')
}

/**
 * Appends strings as each rule requires and trims the output
 * @private
 * @param {String} output The conversion output
 * @returns A trimmed version of the ouput
 * @type String
 */

function postProcess (output) {
  const self = this
  this.rules.forEach(function (rule) {
    if (typeof rule.append === 'function') {
      output = join(output, rule.append(self.options))
    }
  })

  return output.replace(/^[\t\r\n]+/, '').replace(/[\t\r\n\s]+$/, '')
}

/**
 * Converts an element node to its Markdown equivalent
 * @private
 * @param {HTMLElement} node The node to convert
 * @returns A Markdown representation of the node
 * @type String
 */

function replacementForNode (node) {
  const rule = this.rules.forNode(node)
  let content = process.call(this, node)
  const whitespace = node.flankingWhitespace
  if (whitespace.leading || whitespace.trailing) content = content.trim()
  return (
    whitespace.leading +
    rule.replacement(content, node, this.options) +
    whitespace.trailing
  )
}

/**
 * Joins replacement to the current output with appropriate number of new lines
 * @private
 * @param {String} output The current conversion output
 * @param {String} replacement The string to append to the output
 * @returns Joined output
 * @type String
 */

function join (output, replacement) {
  const s1 = trimTrailingNewlines(output)
  const s2 = trimLeadingNewlines(replacement)
  const nls = Math.max(output.length - s1.length, replacement.length - s2.length)
  const separator = '\n\n'.substring(0, nls)

  return s1 + separator + s2
}

/**
 * Determines whether an input can be converted
 * @private
 * @param {String|HTMLElement} input Describe this parameter
 * @returns Describe what it returns
 * @type String|Object|Array|Boolean|Number
 */

function canConvert (input) {
  return (
    input != null && (
      typeof input === 'string' ||
      (input.nodeType && (
        input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11
      ))
    )
  )
}
