export async function printDocumentWhenFontsReady() {
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  if (typeof window !== "undefined") {
    window.print();
  }
}
