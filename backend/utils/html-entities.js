const htmlEntityMap = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(value) {
  let decoded = value === null || value === undefined ? "" : String(value);

  for (let pass = 0; pass < 10; pass += 1) {
    const nextValue = decoded.replace(/&(#\d+|#x[\da-fA-F]+|[a-zA-Z][\w-]*);/g, (match, entity) => {
      if (entity.startsWith("#")) {
        const isHex = entity[1]?.toLowerCase() === "x";
        const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);

        if (!Number.isFinite(codePoint)) {
          return match;
        }

        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }

      return htmlEntityMap[entity.toLowerCase()] ?? match;
    });

    if (nextValue === decoded) {
      break;
    }

    decoded = nextValue;
  }

  return decoded;
}

module.exports = { decodeHtmlEntities };
