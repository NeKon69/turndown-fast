export function extend (destination) {
  for (let i = 1; i < arguments.length; i++) {
    const source = arguments[i]
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) destination[key] = source[key]
    }
  }
  return destination
}

export function repeat (character, count) {
  return Array(count + 1).join(character)
}

export function trimLeadingNewlines (string) {
  return string.replace(/^\n*/, '')
}

export function trimTrailingNewlines (string) {
  // avoid match-at-end regexp bottleneck, see #370
  let indexEnd = string.length
  while (indexEnd > 0 && string[indexEnd - 1] === '\n') indexEnd--
  return string.substring(0, indexEnd)
}

export function trimNewlines (string) {
  return trimTrailingNewlines(trimLeadingNewlines(string))
}

export var blockElements = [
  'ADDRESS', 'ARTICLE', 'ASIDE', 'AUDIO', 'BLOCKQUOTE', 'BODY', 'CANVAS',
  'CENTER', 'DD', 'DIR', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'FORM', 'FRAMESET', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER',
  'HGROUP', 'HR', 'HTML', 'ISINDEX', 'LI', 'MAIN', 'MENU', 'NAV', 'NOFRAMES',
  'NOSCRIPT', 'OL', 'OUTPUT', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD',
  'TFOOT', 'TH', 'THEAD', 'TR', 'UL'
]

export function isBlock (node) {
  return is(node, blockElements)
}

export var voidElements = [
  'AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT',
  'KEYGEN', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'
]

export function isVoid (node) {
  return is(node, voidElements)
}

export function hasVoid (node) {
  return has(node, voidElements)
}

const meaningfulWhenBlankElements = [
  'A', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TH', 'TD', 'IFRAME', 'SCRIPT',
  'AUDIO', 'VIDEO'
]

const descendantTagBits = new Map()
voidElements.concat(meaningfulWhenBlankElements).forEach(function (tagName) {
  if (!descendantTagBits.has(tagName)) {
    descendantTagBits.set(tagName, 1 << descendantTagBits.size)
  }
})

const voidElementsMask = tagMask(voidElements)
const meaningfulWhenBlankElementsMask = tagMask(meaningfulWhenBlankElements)
let descendantTagMasks = new WeakMap()

export function isMeaningfulWhenBlank (node) {
  return is(node, meaningfulWhenBlankElements)
}

export function hasMeaningfulWhenBlank (node) {
  return has(node, meaningfulWhenBlankElements)
}

export function resetDescendantTagCache () {
  descendantTagMasks = new WeakMap()
}

function is (node, tagNames) {
  return tagNames.indexOf(node.nodeName) >= 0
}

function has (node, tagNames) {
  if (node.nodeType === 1 && node.getElementsByTagName) {
    if (tagNames === voidElements) {
      return Boolean(descendantTagMask(node) & voidElementsMask)
    }
    if (tagNames === meaningfulWhenBlankElements) {
      return Boolean(descendantTagMask(node) & meaningfulWhenBlankElementsMask)
    }
  }

  return (
    node.getElementsByTagName &&
    tagNames.some(function (tagName) {
      return node.getElementsByTagName(tagName).length
    })
  )
}

function tagMask (tagNames) {
  return tagNames.reduce(function (mask, tagName) {
    return mask | descendantTagBits.get(tagName)
  }, 0)
}

function descendantTagMask (root) {
  if (descendantTagMasks.has(root)) return descendantTagMasks.get(root)

  const order = []
  const pending = [root]
  while (pending.length) {
    const node = pending.pop()
    if (node !== root && descendantTagMasks.has(node)) continue
    order.push(node)
    for (let child = node.lastChild; child; child = child.previousSibling) {
      if (child.nodeType === 1) pending.push(child)
    }
  }

  for (let index = order.length - 1; index >= 0; index--) {
    const element = order[index]
    let mask = 0
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue
      mask |= descendantTagBits.get(child.nodeName) || 0
      mask |= descendantTagMasks.get(child) || 0
    }
    descendantTagMasks.set(element, mask)
  }

  return descendantTagMasks.get(root) || 0
}

const markdownEscapePattern = /^(?:(-)|(\+ )|(=+)|(#{1,6} )|(~~~)|(>)|(\d+)(\. ))|([\\*`\x5b\x5d_])/g

export function escapeMarkdown (string) {
  return string.replace(
    markdownEscapePattern,
    function (match, dash, plus, equals, heading, tilde, quote, digits, dotSpace, special) {
      if (dash) return '\\-'
      if (plus) return '\\' + plus
      if (equals) return '\\' + equals
      if (heading) return '\\' + heading
      if (tilde) return '\\' + tilde
      if (quote) return '\\>'
      if (digits) return digits + '\\.' + dotSpace.slice(1)
      return special === '\\' ? '\\\\' : '\\' + special
    }
  )
}
