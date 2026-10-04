// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { splitCatalogLabel } from "../util/bilingual-label.ts";

/** English on one line. A zh-Hant-en catalog label stacks the Chinese line under it. */
export function appendCatalogLabel(parent: HTMLElement, text: string): void {
  const { primary, secondary } = splitCatalogLabel(text);
  if (!secondary) {
    parent.appendText(primary);
    return;
  }
  const label = parent.createSpan({ cls: "atomic-label" });
  label.createSpan({ cls: "atomic-label-en", text: primary });
  label.createSpan({
    cls: "atomic-label-zh",
    text: secondary,
    attr: { lang: "zh-Hant-HK" },
  });
}
