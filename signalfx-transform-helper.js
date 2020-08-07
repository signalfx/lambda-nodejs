'use strict';

const MAX_FIELDNAME_LENGTH = 128;
const DETAIL_PREFIX = "detail_";

function isPrimitive(x) {
  return Object(x) !== x;
}

function sanitize(name) {
  let sanitizedName = name.replace(/[^a-zA-Z0-9\-_]+/gi, '_').replace(/[^a-zA-Z0-9\-_]+/gi);
  if (name.length > MAX_FIELDNAME_LENGTH) {
    console.warn('Field name ' + name + ' longer than ' + MAX_FIELDNAME_LENGTH + ' will be truncated.');
    sanitizedName = sanitizedName.substring(0, MAX_FIELDNAME_LENGTH);
  }
  return sanitizedName;
}

function transformDetails(obj) {
  let newObj = {};
  for (let [key, value] of Object.entries(obj)) {
      newObj[sanitize(DETAIL_PREFIX + key)] = isPrimitive(value) ? value : JSON.stringify(value);
  }
  return newObj;
}


module.exports = {
  transformDetails: transformDetails
};