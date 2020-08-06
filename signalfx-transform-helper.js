'use strict';

const FIELD_SEPARATOR = '_';
const MAX_FIELDNAME_LENGTH = 128;

function isPrimitive(x) {
  return Object(x) !== x;
}

function sanitize(name) {
  let sanitizedName = name.replace(/[^a-zA-Z0-9\-_]+/gi, '_');
  if (name.length > MAX_FIELDNAME_LENGTH) {
    console.warn('Field name ' + name + ' longer than ' + MAX_FIELDNAME_LENGTH + ' will be truncated.');
    sanitizedName = sanitizedName.substring(0, MAX_FIELDNAME_LENGTH);
  }
  return sanitizedName;
}

function cleanupRecursiveEmptyObjectsAndAttributes(obj) {
  Object.keys(obj).forEach(function (key) {
    if (obj[key] && typeof obj[key] === 'object' && Object.keys(obj[key]).length !== 0) {
      cleanupRecursiveEmptyObjectsAndAttributes(obj[key])
    } else if (obj[key] && typeof obj[key] === 'object' || obj[key] == null || obj[key] === "") {
      Array.isArray(obj) ? obj.splice(key, 1) : delete obj[key];
      cleanupRecursiveEmptyObjectsAndAttributes(obj);
    }
  });
}

function flatten(obj, newObj, prefix) {
  for (let [key, value] of Object.entries(obj)) {
    if (isPrimitive(key) && isPrimitive(value)) {
      newObj[sanitize(prefix + key)] = value;
    } else if (prefix !== ''){
      newObj[sanitize(prefix + key)] = JSON.stringify(value);
    } else {
      flatten(value, newObj,  prefix + key + FIELD_SEPARATOR);
    }
  }
  return newObj;
}

function flattenObj(obj) {
  cleanupRecursiveEmptyObjectsAndAttributes(obj);
  return flatten(obj, {}, '');
}

module.exports = {
  toKeyValueMap: flattenObj
};