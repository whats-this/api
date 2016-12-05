// Copyright Restify and contributors.
// Modified by Gus Caplan.

// Required modules
const url = require('url');

module.exports.matchURL = function matchURL (re, req) {
  const result = re.exec((typeof req.url === 'string' ? req.url : req.url.pathname).split('?')[0]);
  const params = {};
  if (!result) return false;

  let i = 0;

  if (!re.params) {
    for (i = 1; i < result.length; i++) {
      params[(i - 1)] = result[i];
    }
    return params;
  }

  if (re.params.length === 0) return (params);

  for (const p of re.params) {
    if (++i < result.length) params[p] = decodeURIComponent(result[i]);
  }

  return params;
};

module.exports.compileURL = function compileURL (options) {
  if (options.url instanceof RegExp) return options.url;

  var params = [];
  var pattern = '^';
  var re;
  var _url = url.parse(options.url).pathname;

  _url.split('/').forEach(frag => {
    if (frag.length <= 0) return false;

    pattern += '\\/+';
    if (frag.charAt(0) === ':') {
      var label = frag;
      var index = frag.indexOf('(');
      var subexp;
      if (index === -1) {
        if (options.urlParamPattern) {
          subexp = options.urlParamPattern;
        } else {
          subexp = '[^/]*';
        }
      } else {
        label = frag.substring(0, index);
        subexp = frag.substring(index + 1, frag.length - 1);
      }
      pattern += '(' + subexp + ')';
      params.push(label.slice(1));
    } else {
      pattern += frag;
    }
    return true;
  });
  if (options.strict && _url.slice(-1) === '/') pattern += '\\/';
  if (!options.strict) pattern += '[\\/]*';
  if (pattern === '^') pattern += '\\/';
  pattern += '$';
  re = new RegExp(pattern, options.flags);
  re.params = params;
  return re;
};
