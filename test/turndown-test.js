var Attendant = require('turndown-attendant')
var TurndownService = require('../lib/turndown.cjs')

var attendant = new Attendant({
  file: __dirname + '/index.html',
  TurndownService: TurndownService
})
var test = attendant.test

attendant.run()

test('malformed documents', function (t) {
  t.plan(0)
  var turndownService = new TurndownService()
  turndownService.turndown('<HTML><head></head><BODY><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><body onload=alert(document.cookie);></body></html>')
  t.end()
})

test('null input', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  t.throws(
    function () { turndownService.turndown(null) }, /null is not a string/
  )
})

test('undefined input', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  t.throws(
    function () { turndownService.turndown(void (0)) },
    /undefined is not a string/
  )
})

test('#addRule returns the instance', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  var rule = {
    filter: ['del', 's', 'strike'],
    replacement: function (content) {
      return '~~' + content + '~~'
    }
  }
  t.equal(turndownService.addRule('strikethrough', rule), turndownService)
})

test('#addRule adds the rule', function (t) {
  t.plan(2)
  var turndownService = new TurndownService()
  var rule = {
    filter: ['del', 's', 'strike'],
    replacement: function (content) {
      return '~~' + content + '~~'
    }
  }
  // Assert rules#add is called
  turndownService.rules.add = function (key, r) {
    t.equal(key, 'strikethrough')
    t.equal(rule, r)
  }
  turndownService.addRule('strikethrough', rule)
})

test('#use returns the instance for chaining', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  t.equal(turndownService.use(function plugin () {}), turndownService)
})

test('#use with a single plugin calls the fn with instance', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  function plugin (service) {
    t.equal(service, turndownService)
  }
  turndownService.use(plugin)
})

test('#use with multiple plugins calls each fn with instance', function (t) {
  t.plan(2)
  var turndownService = new TurndownService()
  function plugin1 (service) {
    t.equal(service, turndownService)
  }
  function plugin2 (service) {
    t.equal(service, turndownService)
  }
  turndownService.use([plugin1, plugin2])
})

test('#keep keeps elements as HTML', function (t) {
  t.plan(2)
  var turndownService = new TurndownService()
  var input = '<p>Hello <del>world</del><ins>World</ins></p>'

  // Without `.keep(['del', 'ins'])`
  t.equal(turndownService.turndown(input), 'Hello worldWorld')

  // With `.keep(['del', 'ins'])`
  turndownService.keep(['del', 'ins'])
  t.equal(
    turndownService.turndown('<p>Hello <del>world</del><ins>World</ins></p>'),
    'Hello <del>world</del><ins>World</ins>'
  )
})

test('#keep returns the TurndownService instance for chaining', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  t.equal(turndownService.keep(['del', 'ins']), turndownService)
})

test('keep rules are overridden by the standard rules', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  turndownService.keep('p')
  t.equal(turndownService.turndown('<p>Hello world</p>'), 'Hello world')
})

test('keeping elements that have a blank textContent but contain significant elements', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  turndownService.keep('figure')
  t.equal(
    turndownService.turndown('<figure><iframe src="http://example.com"></iframe></figure>'),
    '<figure><iframe src="http://example.com"></iframe></figure>'
  )
})

test('keepReplacement can be customised', function (t) {
  t.plan(1)
  var turndownService = new TurndownService({
    keepReplacement: function (content, node) {
      return '\n\n' + node.outerHTML + '\n\n'
    }
  })
  turndownService.keep(['del', 'ins'])
  t.equal(turndownService.turndown(
    '<p>Hello <del>world</del><ins>World</ins></p>'),
    'Hello \n\n<del>world</del>\n\n<ins>World</ins>'
  )
})

test('#remove removes elements', function (t) {
  t.plan(2)
  var turndownService = new TurndownService()
  var input = '<del>Please redact me</del>'

  // Without `.remove('del')`
  t.equal(turndownService.turndown(input), 'Please redact me')

  // With `.remove('del')`
  turndownService.remove('del')
  t.equal(turndownService.turndown(input), '')
})

test('#remove returns the TurndownService instance for chaining', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  t.equal(turndownService.remove(['del', 'ins']), turndownService)
})

test('remove elements are overridden by rules', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  turndownService.remove('p')
  t.equal(turndownService.turndown('<p>Hello world</p>'), 'Hello world')
})

test('remove elements are overridden by keep', function (t) {
  t.plan(1)
  var turndownService = new TurndownService()
  turndownService.keep(['del', 'ins'])
  turndownService.remove(['del', 'ins'])
  t.equal(turndownService.turndown(
    '<p>Hello <del>world</del><ins>World</ins></p>'),
    'Hello <del>world</del><ins>World</ins>'
  )
})

test('buffered sibling joins match the original join semantics', function (t) {
  var values
  var turndownService = new TurndownService()
  turndownService.addRule('join-test-segment', {
    filter: 'x-segment',
    replacement: function (content, node) {
      return values[Number(node.getAttribute('data-index'))]
    }
  })
  turndownService.addRule('join-test-container', {
    filter: 'x-container',
    replacement: function (content) {
      return content
    }
  })

  var cases = [
    [],
    ['one'],
    ['one', '\n', '\n\n', 'two'],
    ['one', '', '\n', '\n\n', 'two'],
    ['one\n\n\n', '', 'two'],
    ['one\n\n\n', '\n\n\n', 'two'],
    ['\n\n\none', 'two'],
    ['\n\n\n'],
    ['', '', '\n', '\n\n', ''],
    ['one\r', 'two']
  ]

  t.plan(cases.length)
  cases.forEach(function (testCase) {
    values = testCase
    var segments = testCase.map(function (value, index) {
      return '<x-segment data-index="' + index + '">x</x-segment>'
    }).join('')
    var html = '<x-container>' + segments + '</x-container>'
    var expected = testCase.reduce(function (output, replacement) {
      return referenceJoin(output, replacement)
    }, '')
    expected = referenceJoin('', expected)
      .replace(/^[\t\r\n]+/, '')
      .replace(/[\t\r\n\s]+$/, '')

    t.equal(turndownService.turndown(html), expected, JSON.stringify(testCase))
  })

  function referenceJoin (output, replacement) {
    var outputEnd = output.length
    while (outputEnd > 0 && output.charCodeAt(outputEnd - 1) === 10) outputEnd--
    var replacementStart = 0
    while (replacementStart < replacement.length && replacement.charCodeAt(replacementStart) === 10) replacementStart++
    var newlineCount = Math.max(output.length - outputEnd, replacementStart)
    return output.substring(0, outputEnd) + '\n\n'.substring(0, newlineCount) + replacement.substring(replacementStart)
  }
})

test('one-pass Markdown escaping matches v7.2.4 escape behavior', function (t) {
  var turndownService = new TurndownService()
  var cases = [
    '\\* `code` [link] _emphasis_',
    '- list\n+ list\n= heading\n### heading\n####### heading',
    '~~~code\n> quote\n1. ordered\n12. ordered\n1.\tunaltered',
    '\\# not a heading\ntext * [ ] _'
  ]
  var characters = '\\*`[]_-=+#~>0123456789 .\t\n'

  for (var i = 0; i < characters.length; i++) {
    cases.push(characters.charAt(i))
    for (var j = 0; j < characters.length; j++) {
      cases.push(characters.charAt(i) + characters.charAt(j))
    }
  }

  t.plan(cases.length)
  cases.forEach(function (string) {
    t.equal(turndownService.escape(string), referenceEscape(string), JSON.stringify(string))
  })

  function referenceEscape (string) {
    var escapes = [
      [/\\/g, '\\\\'],
      [/\*/g, '\\*'],
      [/^-/g, '\\-'],
      [/^\+ /g, '\\+ '],
      [/^(=+)/g, '\\$1'],
      [/^(#{1,6}) /g, '\\$1 '],
      [/`/g, '\\`'],
      [/^~~~/g, '\\~~~'],
      [/\[/g, '\\['],
      [/\]/g, '\\]'],
      [/^>/g, '\\>'],
      [/_/g, '\\_'],
      [/^(\d+)\. /g, '$1\\. ']
    ]
    return escapes.reduce(function (escaped, escape) {
      return escaped.replace(escape[0], escape[1])
    }, string)
  }
})
