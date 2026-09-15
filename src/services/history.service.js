function plain(value) {
  if (value === undefined) return null;
  if (value && typeof value.toObject === 'function') return value.toObject({ depopulate: true });
  return JSON.parse(JSON.stringify(value));
}

function equal(left, right) {
  return JSON.stringify(plain(left)) === JSON.stringify(plain(right));
}

function buildFieldChanges(before, after, fields) {
  return fields.filter((field) => !equal(before?.[field], after?.[field])).map((field) => ({
    field_name: field,
    from: plain(before?.[field]),
    to: plain(after?.[field]),
  }));
}

module.exports = { buildFieldChanges, plain };
