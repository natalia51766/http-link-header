# http-link-header

Parses and serializes the HTTP Link header (RFC 8288) into an array of `{ target, params }` objects.

## Usage

```js
import { parseLinkHeader, formatLinkHeader } from 'http-link-header';

const links = parseLinkHeader('<https://api.example.com/page2>; rel="next"; title="Page 2", <https://api.example.com/page1>; rel="prev"');
// [
//   { target: 'https://api.example.com/page2', params: { rel: 'next', title: 'Page 2' } },
//   { target: 'https://api.example.com/page1', params: { rel: 'prev' } }
// ]

const header = formatLinkHeader(links);
// '<https://api.example.com/page2>; rel="next"; title="Page 2", <https://api.example.com/page1>; rel="prev"'
```

## Why this exists

Link headers are common in REST APIs for pagination and Web Linking, but parsing them by hand is error-prone: quoted strings with escapes, multiple comma-separated links, and case-insensitive parameter names all trip up naive splits. This library handles that with zero dependencies.

The trade-off: this is a pure parser/serializer. It does not resolve relative URIs against a base, and it does not split the `rel` parameter into an array. The `rel` value is returned verbatim as a string — if you need individual relation types, split on whitespace yourself. This keeps the library predictable and avoids imposing an interpretation the caller may not want.

## Edge cases

- Parameter names are lowercased (RFC 8288 treats them as case-insensitive).
- Both quoted (`rel="next"`) and unquoted (`rel=next`) parameter values are accepted on parse. Format always quotes.
- Backslash escaping is supported in quoted values on both parse and format.
- An empty or whitespace-only header returns an empty array.
- Malformed input (missing `<`, unterminated `>`, unterminated quote) throws a `SyntaxError`.
