/**
 * Parse and serialize HTTP Link headers per RFC 8288.
 *
 * A Link header looks like:
 *   Link: <https://api.example.com/next>; rel="next", <https://api.example.com/prev>; rel="prev"
 *
 * We return an array of objects, one per link, preserving order:
 *   { target: string, params: { [key: string]: string } }
 *
 * Design decisions:
 *  - Parameter keys are lowercased. RFC 8288 says rel values are case-insensitive
 *    and by convention all link-param names are treated as case-insensitive.
 *  - The `rel` parameter is NOT split into an array. The caller can split on
 *    whitespace if they want individual relation types. This keeps the library
 *    a thin parser; splitting rel is an interpretation we leave to the consumer.
 *    (RFC 8288 allows multiple rel types separated by spaces.)
 *  - We do not resolve relative URIs against a base. That requires a base URI
 *    the parser does not have. The target string is returned verbatim.
 *  - Quoted-string values support backslash escaping per RFC 7230, so a value
 *    like "a\\"b" yields a"b.
 *  - Unquoted parameter values are accepted (e.g. rel=next) and read up to the
 *    next semicolon or comma. This is lenient but matches what servers emit.
 */

/**
 * Parse a Link header value into an array of link objects.
 * @param {string} header - The full Link header value (may contain multiple comma-separated links).
 * @returns {Array<{target: string, params: Object<string,string>}>}
 */
export function parseLinkHeader(header) {
  if (typeof header !== 'string') {
    throw new TypeError('Link header must be a string');
  }

  const links = [];
  let i = 0;
  const len = header.length;

  while (i < len) {
    // Skip whitespace and commas between links.
    while (i < len && (header[i] === ' ' || header[i] === '\t' || header[i] === ',')) {
      i++;
    }
    if (i >= len) break;

    // Each link must start with '<'.
    if (header[i] !== '<') {
      throw new SyntaxError(`Expected '<' at position ${i}, got '${header[i]}'`);
    }
    i++; // consume '<'

    // Read the target URI up to '>'.
    let target = '';
    while (i < len && header[i] !== '>') {
      target += header[i];
      i++;
    }
    if (i >= len) {
      throw new SyntaxError('Unterminated target URI: missing ">"');
    }
    i++; // consume '>'

    // Read parameters until we hit a comma (next link) or end of string.
    const params = {};
    while (i < len) {
      // Skip whitespace and semicolons.
      while (i < len && (header[i] === ' ' || header[i] === '\t' || header[i] === ';')) {
        i++;
      }
      if (i >= len) break;
      if (header[i] === ',') break; // next link

      // Read parameter name.
      let name = '';
      while (i < len && header[i] !== '=' && header[i] !== ';' && header[i] !== ',') {
        name += header[i];
        i++;
      }
      name = name.trim().toLowerCase();
      if (name === '') {
        // Stray semicolon or whitespace; skip.
        continue;
      }

      let value = '';
      if (i < len && header[i] === '=') {
        i++; // consume '='
        // Skip optional whitespace after '='.
        while (i < len && (header[i] === ' ' || header[i] === '\t')) {
          i++;
        }

        if (i < len && header[i] === '"') {
          // Quoted-string with backslash escaping per RFC 7230.
          i++; // consume opening quote
          while (i < len && header[i] !== '"') {
            if (header[i] === '\\' && i + 1 < len) {
              value += header[i + 1];
              i += 2;
            } else {
              value += header[i];
              i++;
            }
          }
          if (i >= len) {
            throw new SyntaxError('Unterminated quoted-string in parameter value');
          }
          i++; // consume closing quote
        } else {
          // Unquoted token: read up to ';' or ',' or whitespace.
          while (i < len && header[i] !== ';' && header[i] !== ',' && header[i] !== ' ' && header[i] !== '\t') {
            value += header[i];
            i++;
          }
        }
      }

      params[name] = value;
    }

    links.push({ target, params });
  }

  return links;
}

/**
 * Serialize an array of link objects into a Link header value.
 * @param {Array<{target: string, params: Object<string,string>}>} links
 * @returns {string}
 */
export function formatLinkHeader(links) {
  if (!Array.isArray(links)) {
    throw new TypeError('links must be an array');
  }

  const parts = links.map((link) => {
    if (!link || typeof link.target !== 'string') {
      throw new TypeError('each link must have a string target');
    }
    const params = link.params || {};
    let segment = `<${link.target}>`;
    for (const key of Object.keys(params)) {
      const val = String(params[key]);
      segment += `; ${key}="${escapeQuoted(val)}"`;
    }
    return segment;
  });

  return parts.join(', ');
}

/**
 * Escape a value for inclusion inside a double-quoted string.
 * Backslash and double-quote are escaped with a backslash.
 */
function escapeQuoted(value) {
  let out = '';
  for (const ch of value) {
    if (ch === '"' || ch === '\\') {
      out += '\\';
    }
    out += ch;
  }
  return out;
}
