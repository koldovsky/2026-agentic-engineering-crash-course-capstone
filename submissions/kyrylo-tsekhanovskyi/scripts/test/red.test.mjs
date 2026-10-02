import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRedRun, stripAnsi } from '../lib/red.mjs';

test('failing assertions (or not-implemented stubs) count as red', () => {
  for (const output of [
    'Assert.Equal() Failure: Values differ\nFailed!  - Failed:     2, Passed:     5, Skipped:     0, Total:     7',
    'System.NotImplementedException : The method or operation is not implemented.\nFailed!  - Failed:     1, Passed:     0',
    'AssertionError: expected 3 to be 2\n Test Files  1 failed | 3 passed (4)\n      Tests  2 failed | 5 passed (7)',
    'AssertionError [ERR_ASSERTION]: Expected values to be strictly equal\nℹ tests 7\nℹ pass 5\nℹ fail 2',
  ]) {
    assert.equal(classifyRedRun({ exitCode: 1, output }).ok, true, output);
  }
});

test('an HttpTestingController expectation failure counts as red', () => {
  const output =
    'Error: Expected one matching request for criteria "Match URL: /api/projects", found none.\n' +
    '      Tests  1 failed | 4 passed (5)';
  assert.equal(classifyRedRun({ exitCode: 1, output }).ok, true);
});

test('a Playwright assertion failure counts as red', () => {
  const output = [
    '  1) [chromium] › e2e/smoke.spec.ts:3:5 › skeleton: app loads',
    '    Error: expect(page).toHaveTitle(expected) failed',
    '    Expected: "BOMKeeper"',
    '    Received: "Bomkeeper"',
    '  1 failed',
    '    [chromium] › e2e/smoke.spec.ts:3:5 › skeleton: app loads',
  ].join('\n');
  assert.equal(classifyRedRun({ exitCode: 1, output }).ok, true);
});

test('a Playwright locator error in the test itself is not red', () => {
  const output = [
    '    Error: expect(locator).toContainText(expected) failed',
    "    Error: strict mode violation: getByLabel('Status', { exact: true }) resolved to 2 elements:",
    '  1 failed',
  ].join('\n');
  const r = classifyRedRun({ exitCode: 1, output });
  assert.equal(r.ok, false);
  assert.match(r.reason, /test error/i);
});

test('Playwright infrastructure failures are not red', () => {
  for (const output of [
    "Error: browserType.launch: Executable doesn't exist at C:\\ms-playwright\\chromium\n  1 failed",
    'Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5272/\n  1 failed',
  ]) {
    const r = classifyRedRun({ exitCode: 1, output });
    assert.equal(r.ok, false, output);
    assert.match(r.reason, /infrastructure/i);
  }
});

test('coloured (ANSI) test output is classified like plain output', () => {
  const output =
    '\u001b[31m\u001b[1mAssertionError\u001b[22m: expected \'/\' to be \'/projects\'\u001b[39m\n' +
    '\u001b[2m      Tests \u001b[22m \u001b[1m\u001b[31m2 failed\u001b[39m\u001b[22m\u001b[2m | \u001b[22m\u001b[1m\u001b[32m1 passed\u001b[39m';
  assert.equal(classifyRedRun({ exitCode: 1, output }).ok, true);
});

test('stripAnsi removes colour codes', () => {
  assert.equal(stripAnsi('\u001b[1m\u001b[31m2 failed\u001b[39m\u001b[22m'), '2 failed');
});

test('a passing run is not red', () => {
  const r = classifyRedRun({ exitCode: 0, output: 'Passed!  - Failed:     0, Passed:     7' });
  assert.equal(r.ok, false);
  assert.match(r.reason, /passed/i);
});

test('a C# compile error is not red', () => {
  const r = classifyRedRun({
    exitCode: 1,
    output: 'ItemServiceTests.cs(12,5): error CS0246: The type or namespace name could not be found',
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /compile/i);
});

test('a TypeScript compile error is not red', () => {
  for (const output of ['src/app.spec.ts:3:1 - error TS2307: Cannot find module', '✘ [ERROR] TS2304: Cannot find name']) {
    const r = classifyRedRun({ exitCode: 1, output });
    assert.equal(r.ok, false, output);
    assert.match(r.reason, /compile/i);
  }
});

test('a run where no tests executed is not red', () => {
  for (const output of ['No test is available in BOMKeeper.BLL.Tests.dll', 'No test files found, exiting with code 1']) {
    const r = classifyRedRun({ exitCode: 1, output });
    assert.equal(r.ok, false, output);
    assert.match(r.reason, /no tests/i);
  }
});

test('an infrastructure or fixture failure is not red, even with a failed-test count', () => {
  for (const output of [
    "'dotnet' is not recognized as an internal or external command",
    'npm error Missing script: "test"',
    'error NU1101: Unable to find package Foo. No packages exist with this id',
    'System.AggregateException : One or more errors occurred. (Class fixture type \'ApiFactory\' threw in its InitializeAsync)\n' +
      'DockerUnavailableException : Docker is either not running or misconfigured\nFailed!  - Failed:     4, Passed:     0',
  ]) {
    const r = classifyRedRun({ exitCode: 1, output });
    assert.equal(r.ok, false, output);
    assert.match(r.reason, /infrastructure/i);
  }
});

test('failed tests without an assertion or not-implemented failure are not red', () => {
  const r = classifyRedRun({ exitCode: 1, output: 'System.NullReferenceException\nFailed!  - Failed:     1, Passed:     3' });
  assert.equal(r.ok, false);
  assert.match(r.reason, /assertion/i);
});
