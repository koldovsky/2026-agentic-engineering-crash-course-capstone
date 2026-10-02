import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mentionsEnvFile, envAccessInToolInput } from '../lib/env-guard.mjs';

test('.env files, variants and wildcards are detected', () => {
  for (const s of [
    'cat .env',
    'cat .env*',
    'D:\\repo\\backend\\.env',
    '/home/u/app/.env.local',
    '{"file_path":"frontend/.env.production"}',
    'Get-Content ".env"',
    '.env.sample',
    '.envrc',
    'cat <.env',
    'cat .env.example*',
    'Get-Content .ENV',
    'type Backend\\.Env.Local',
    'cat .e*',
    'Get-Content .e*',
    'cat .env{,.local}',
    'cat .env+backup',
    'cat .[e]nv',
    'ls ./.en?',
    'cat .e{nv,x}',
  ]) {
    assert.equal(mentionsEnvFile(s), true, s);
  }
});

test('only the .env.example template and look-alikes are allowed', () => {
  for (const s of [
    'cat .env.example',
    'cp .env.example backend/',
    'process.env.NODE_ENV',
    'Process.Env',
    'environment.ts',
    '$env:PATH',
    'dotnet build',
    'ls *.md',
    'git add .editorconfig',
    'cat .eslintrc*',
    'rm -r .angular/*',
  ]) {
    assert.equal(mentionsEnvFile(s), false, s);
  }
});

test('file tools are judged by their paths, not by the content they write', () => {
  assert.equal(envAccessInToolInput({ file_path: 'AGENTS.md', content: 'Never read .env files' }), false);
  assert.equal(
    envAccessInToolInput({ file_path: 'docs/x.md', old_string: 'a', new_string: 'see .env.local' }),
    false,
  );
  assert.equal(envAccessInToolInput({ file_path: 'backend/.env', content: 'x' }), true);
  assert.equal(envAccessInToolInput({ path: '.', pattern: '.env*' }), true);
});

test('shell tools are judged by their command', () => {
  assert.equal(envAccessInToolInput({ command: 'type .env' }), true);
  assert.equal(envAccessInToolInput({ CommandLine: 'cat .env.local' }), true);
  assert.equal(envAccessInToolInput({ command: 'git status' }), false);
});
