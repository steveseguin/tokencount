const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(process.env.TOKENCOUNT_HTML || path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function app(input) {
    const fields = Object.fromEntries(['inputText', 'currentCount', 'runningTotal', 'compressionInfo'].map(id => [id, { value: id === 'inputText' ? input : '', textContent: '' }]));
    const context = vm.createContext({ document: { getElementById: id => fields[id] } });
    vm.runInContext(script, context);
    return { fields, run: code => vm.runInContext(code, context) };
}
const cases = [
    ['Python syntax, indent, and literals', '```python\nfor i in range(3):\n    print("you and me")\n```'],
    ['blank lines inside code', '```js\nconst value = "with you";\n\n\nconsole.log(value);\n```'],
    ['CRLF and tabs', '```python\r\nfor x in xs:\r\n\tprint("because")\r\n```'],
    ['punctuation and spaces', '```text\nwhy   are  you here ?\n```'],
    ['empty fence', '```\n```'],
    ['indented fence delimiter bytes', '  ```python\nfor x in xs:\n    print("you")\n  ```  '],
    ['backticks inside code strings', '```js\nconst fence = "```";\nfor (const you of list) {\n    console.log("you and me");\n}\n```'],
    ['four-backtick enclosing fence', '````markdown\n```python\nfor x in xs:\n    print("you")\n```\n````'],
    ['longer closing fence', '```python\nfor x in xs:\n    print("you")\n````']
];
for (const [name, input] of cases) test(name, () => { const a = app(input); a.run('compressText()'); assert.equal(a.fields.inputText.value, input); });
test('prose still compresses', () => { const a = app('  please   go to town , and thanks !  '); a.run('compressText()'); assert.equal(a.fields.inputText.value, 'pls go 2 town, & thx!'); });
test('multiple fences keep exact bytes and boundary newlines', () => {
    const one = '```python\nfor x in xs:\n    print("you")\n```';
    const two = '```js\nconst why = "because";\n```';
    const a = app('please read\n\n' + one + '\n\nand thanks\n' + two + '\nwith you');
    a.run('compressText()');
    assert.equal(a.fields.inputText.value, 'pls read\n\n' + one + '\n\n& thx\n' + two + '\nw/ u');
});
test('adjacent fences', () => { const input = '```a\nand\n```\n\n```b\nyou\n```'; const a = app(input); a.run('compressText()'); assert.equal(a.fields.inputText.value, input); });
test('count and reset remain available', () => { const a = app('hello world'); a.run('countTokens()'); assert.equal(a.fields.currentCount.textContent, 2); a.run('resetCount()'); assert.equal(a.fields.inputText.value, ''); assert.equal(a.fields.runningTotal.textContent, '0'); });
test('display count reflects resulting text', () => { const a = app('please and you'); a.run('compressText()'); assert.equal(a.fields.currentCount.textContent, a.run('estimateTokens(document.getElementById("inputText").value)')); });
