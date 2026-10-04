/** Paint one catalog string. Catalogs and activity names are already one language. */
export function appendCatalogLabel(parent: HTMLElement, text: string): void {
  parent.appendText(text);
}

/** Same single line, for a unit or a short phrase inside a sentence. */
export function appendInlineCatalog(parent: HTMLElement, text: string): void {
  parent.appendText(text);
}
