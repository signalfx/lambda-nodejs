'use strict';

const MAX_FIELDNAME_LENGTH = 128;
const DETAIL_PREFIX = "detail_";

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

function extractDetailsForSfx(cwEvent) {
  let detailsMap = {};
  for (let [key, value] of Object.entries(cwEvent.detail)) {
    let sanitizedKey = sanitize(DETAIL_PREFIX + key);
    if (value == null || typeof value == "boolean" || !isPrimitive(value)) {
      detailsMap[sanitizedKey] = JSON.stringify(value);
    } else {
      detailsMap[sanitizedKey] = value;
    }
  }
  return detailsMap;
}


module.exports = {
  extractDetailsForSfx: extractDetailsForSfx
};