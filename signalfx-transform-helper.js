'use strict';

const FIELD_SEPARATOR = '_';
const MAX_FIELDNAME_LENGTH = 128;

function isPrimitive(x) {
  return Object(x) !== x;
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9\-_]+/gi, '_').substring(0, MAX_FIELDNAME_LENGTH);
}

function flatten(obj, newObj, prefix) {
  for (let entry of Object.entries(obj)) {
    if (isPrimitive(entry[0]) && isPrimitive(entry[1])) {
      newObj[sanitize(prefix + entry[0])] = entry[1];
    } else {
      flatten(entry[1], newObj,  prefix + entry[0] + FIELD_SEPARATOR);
    }
  }
  return newObj;
}

function flattenObj(obj) {
  return flatten(obj, {}, '');
}

module.exports = {
  toKeyValueMap: flattenObj
};