var test = require('tape').test
var rewire = require('rewire')
var turndownModule = rewire('../lib/turndown.cjs')

test('edge whitespace detection',function (t) {
  function ews (leadingAscii, leadingNonAscii, trailingNonAscii, trailingAscii) {
    return {
      leading: leadingAscii + leadingNonAscii,
      leadingAscii: leadingAscii,
      leadingNonAscii: leadingNonAscii,
      trailing: trailingNonAscii + trailingAscii,
      trailingNonAscii: trailingNonAscii,
      trailingAscii: trailingAscii
    }
  }
  var WS = '\r\n \t'
  var TEST_CASES = [
    [`${WS}HELLO WORLD${WS}`, ews(WS, '', '', WS)],
    [`${WS}H${WS}`, ews(WS, '', '', WS)],
    [`${WS}\xa0${WS}HELLO${WS}WORLD${WS}\xa0${WS}`, ews(WS, `\xa0${WS}`, `${WS}\xa0`, WS)],
    [`\xa0${WS}HELLO${WS}WORLD${WS}\xa0`, ews('', `\xa0${WS}`, `${WS}\xa0`, '')],
    [`\xa0${WS}\xa0`, ews('', `\xa0${WS}\xa0`, '', '')],
    [`${WS}\xa0${WS}`, ews(WS, `\xa0${WS}`, '', '')],
    [`${WS}\xa0`, ews(WS, `\xa0`, '', '')],
    [`HELLO WORLD`, ews('', '', '', '')],
    [``, ews('', '', '', '')],
    [`TEST${Array(32768).join(' ')}END`, ews('', '', '', '')], // performance check
  ]
  t.plan(TEST_CASES.length)
  t.timeoutAfter(300)
  var edgeWhitespace = turndownModule.__get__('edgeWhitespace')
  TEST_CASES.forEach(function (c) {
    t.deepEqual(edgeWhitespace(c[0]), c[1])
  })
})

test('lazy descendant tag summaries preserve descendant query semantics', function (t) {
  var has = turndownModule.__get__('has')
  var voidElements = turndownModule.__get__('voidElements')
  var meaningfulWhenBlankElements = turndownModule.__get__('meaningfulWhenBlankElements')
  var resetDescendantTagCache = turndownModule.__get__('resetDescendantTagCache')
  var image = makeElement('IMG', [])
  var span = makeElement('SPAN', [image])
  var root = makeElement('DIV', [span])
  var rootLastChildReads = 0

  Object.defineProperty(root, 'lastChild', {
    get: function () {
      rootLastChildReads++
      return span
    }
  })

  t.equal(has(root, voidElements), true, 'finds a void descendant')
  t.equal(has(root, meaningfulWhenBlankElements), false, 'does not report unrelated tags')
  t.equal(has(image, voidElements), false, 'does not include the queried element itself')
  t.equal(rootLastChildReads, 1, 'reuses a computed summary for a later tag query')
  t.equal(
    has(makeElement('DIV', [makeElement('TABLE', [])]), meaningfulWhenBlankElements),
    true,
    'finds a meaningful-when-blank descendant'
  )

  resetDescendantTagCache()
  t.equal(has(root, voidElements), true, 'can recompute after the cache is reset')
  t.equal(rootLastChildReads, 2, 'cache reset causes a fresh traversal')

  var customQueries = 0
  var customNode = {
    nodeType: 1,
    getElementsByTagName: function (tagName) {
      customQueries++
      return { length: tagName === 'CUSTOM' ? 1 : 0 }
    }
  }
  t.equal(has(customNode, ['CUSTOM']), true, 'keeps the generic tag-list fallback')
  t.equal(customQueries, 1, 'queries custom tag lists through the DOM API')
  t.end()

  function makeElement (name, children) {
    var node = {
      nodeType: 1,
      nodeName: name,
      firstChild: children[0] || null,
      lastChild: children[children.length - 1] || null,
      getElementsByTagName: function (tagName) {
        var matches = 0
        visit(node)
        return { length: matches }

        function visit (parent) {
          for (var child = parent.firstChild; child; child = child.nextSibling) {
            if (child.nodeType !== 1) continue
            if (child.nodeName.toLowerCase() === tagName.toLowerCase()) matches++
            visit(child)
          }
        }
      }
    }

    children.forEach(function (child, index) {
      child.previousSibling = children[index - 1] || null
      child.nextSibling = children[index + 1] || null
    })
    return node
  }
})
