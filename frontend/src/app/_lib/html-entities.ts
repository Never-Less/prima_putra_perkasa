const htmlEntityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function decodeHtmlEntities(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);

  return text.replace(/&(#\d+|#x[\da-fA-F]+|[a-zA-Z][\w-]*);/g, (match, entity: string) => {
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
}
