// Decides whether a test run counts as valid TDD "red" evidence: the tests must run, and at least one
// must fail on an assertion (or on a not-implemented stub). A compile error, an empty run, or an
// infrastructure or fixture failure (missing tool or script, package restore, Docker stopped) is the
// wrong reason to be red.
const COMPILE_ERRORS = [/\berror CS\d{4}\b/, /\berror TS\d{4,5}\b/, /\[ERROR\] TS\d{4,5}\b/];
// Errors in the test code itself, not missing behaviour (an ambiguous or invalid selector).
const TEST_ERRORS = [/strict mode violation/i, /Unknown engine|is not a valid selector/i];
const NO_TESTS = [/No test is available/i, /No test files found/i, /\bTotal tests?: 0\b/i];
const INFRASTRUCTURE = [
  /is not recognized as an internal or external command/i,
  /command not found/i,
  /Missing script/i,
  /\berror NU\d{4}\b/,
  /DockerUnavailableException|Docker is either not running|Cannot connect to the Docker daemon/i,
  /(Class|Collection|Assembly) fixture type .* threw/i,
  /did not have matching fixture data/i,
  /browserType\.launch|Executable doesn't exist|ERR_CONNECTION_REFUSED|config\.webServer/i, // Playwright
];
const FAILING_TESTS = [
  /\bFailed:\s+[1-9]\d*/, // dotnet test
  /\bTests\s+[1-9]\d* failed\b/, // Vitest
  /ℹ fail [1-9]\d*/, // node:test
  /^\s*[1-9]\d* failed\s*$/m, // Playwright summary
];
const ASSERTION_OR_STUB = [
  /\bAssert\.\w+\(\) Failure/, // xUnit
  /\bXunit\.Sdk\.\w+Exception/,
  /\bAssertionError\b/, // Vitest / Chai / node:assert
  /\bexpected .+ to /i,
  /\bError: expect\(/, // Playwright web-first assertions
  /Expected (one|no) matching requests? for criteria/, // Angular HttpTestingController
  /NotImplementedException|not implemented/i,
];

// Test runners colour their output (Vitest does even without a TTY); patterns must see plain text.
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

export function stripAnsi(text) {
  return String(text).replace(ANSI, '');
}

export function classifyRedRun({ exitCode, output: rawOutput }) {
  const output = stripAnsi(rawOutput);
  const reject = (reason) => ({ ok: false, reason });
  if (exitCode === 0) return reject('Tests passed; a red run must fail. Write the checks before the code.');
  if (COMPILE_ERRORS.some((re) => re.test(output))) {
    return reject('Compile error; add the minimal stubs so the tests compile and fail on assertions.');
  }
  if (TEST_ERRORS.some((re) => re.test(output))) {
    return reject('Test error (ambiguous or invalid selector), not missing behaviour; fix the test and rerun.');
  }
  if (NO_TESTS.some((re) => re.test(output))) return reject('No tests ran; check the test filter or test discovery.');
  if (INFRASTRUCTURE.some((re) => re.test(output))) {
    return reject('Infrastructure or fixture failure (tool, script, packages, Docker); fix the environment and rerun.');
  }
  if (!FAILING_TESTS.some((re) => re.test(output))) {
    return reject('No failing test detected; the run probably failed for an infrastructure reason.');
  }
  if (!ASSERTION_OR_STUB.some((re) => re.test(output))) {
    return reject('Tests failed, but not on an assertion or a not-implemented stub; check the failure reason.');
  }
  return { ok: true, reason: 'Tests ran and failed on assertions.' };
}
