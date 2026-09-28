import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLinkHeader, formatLinkHeader } from '../src/index.js';

test('parses a single link with rel parameter', () => {
  const result = parseLinkHeader('<https://api.example.com/next>; rel="next"');
  assert.deepEqual(result, [
    { target: 'https://api.example.com/next', params: { rel: 'next' } },
  ]);
});

test('parses multiple comma-separated links', () => {
  const result = parseLinkHeader('<https://api.example.com/next>; rel="next", <https://api.example.com/prev>; rel="prev"');
  assert.deepEqual(result, [
    { target: 'https://api.example.com/next', params: { rel: 'next' } },
    { target: 'https://api.example.com/prev', params: { rel: 'prev' } },
  ]);
});

test('parses link with multiple parameters', () => {
  const result = parseLinkHeader('<https://api.example.com/page2>; rel="next"; title="Page 2"; type="text/html"');
  assert.deepEqual(result, [
    { target: 'https://api.example.com/page2', params: { rel: 'next', title: 'Page 2', type: 'text/html' } },
  ]);
});

test('lowercases parameter names', () => {
  const result = parseLinkHeader('<https://api.example.com/x>; REL="next"; Title="Foo"');
  assert.deepEqual(result, [
    { target: 'https://api.example.com/x', params: { rel: 'next', title: 'Foo' } },
  ]);
});

test('accepts unquoted parameter values', () => {
  const result = parseLinkHeader('<https://api.example.com/x>; rel=next');
  assert.deepEqual(result, [
    { target: 'https://api.example.com/x', params: { rel: 'next' } },
  ]);
});

test('handles backslash escaping in quoted values', () => {
  const result = parseLinkHeader('<https://api.example.com/x>; title="a\\"b"');
  assert.deepEqual(result, [
    { target: 'https://api.example.com/x', params: { title: 'a"b' } },
  ]);
});

test('handles empty header string', () => {
  assert.deepEqual(parseLinkHeader(''), []);
});

test('handles header with only whitespace', () => {
  assert.deepEqual(parseLinkHeader('   '), []);
});

test('preserves multiple rel types as a single string', () => {
  const result = parseLinkHeader('<https://api.example.com/x>; rel="next alternate"');
  assert.deepEqual(result, [
    { target: 'https://api.example.com/x', params: { rel: 'next alternate' } },
  ]);
});

test('throws on missing opening angle bracket', () => {
  assert.throws(() => parseLinkHeader('https://api.example.com/x>; rel="next"'), SyntaxError);
});

test('throws on unterminated target URI', () => {
  assert.throws(() => parseLinkHeader('<https://api.example.com/x; rel="next"'), SyntaxError);
});

test('throws on unterminated quoted string', () => {
  assert.throws(() => parseLinkHeader('<https://api.example.com/x>; rel="next'), SyntaxError);
});

test('formats a single link', () => {
  const result = formatLinkHeader([
    { target: 'https://api.example.com/next', params: { rel: 'next' } },
  ]);
  assert.equal(result, '<https://api.example.com/next>; rel="next"');
});

test('formats multiple links', () => {
  const result = formatLinkHeader([
    { target: 'https://api.example.com/next', params: { rel: 'next' } },
    { target: 'https://api.example.com/prev', params: { rel: 'prev' } },
  ]);
  assert.equal(result, '<https://api.example.com/next>; rel="next", <https://api.example.com/prev>; rel="prev"');
});

test('escapes quotes and backslashes when formatting', () => {
  const result = formatLinkHeader([
    { target: 'https://api.example.com/x', params: { title: 'a"b\\c' } },
  ]);
  assert.equal(result, '<https://api.example.com/x>; title="a\\"b\\\\c"');
});

test('round-trips parse then format', () => {
  const original = '<https://api.example.com/next>; rel="next"; title="Page 2", <https://api.example.com/prev>; rel="prev"';
  const parsed = parseLinkHeader(original);
  const formatted = formatLinkHeader(parsed);
  assert.equal(formatted, original);
});

test('format with no params produces just the target', () => {
  const result = formatLinkHeader([
    { target: 'https://api.example.com/x', params: {} },
  ]);
  assert.equal(result, '<https://api.example.com/x>');
});

test('throws on non-string input to parse', () => {
  assert.throws(() => parseLinkHeader(42), TypeError);
});

test('throws on non-array input to format', () => {
  assert.throws(() => formatLinkHeader('not an array'), TypeError);
});
