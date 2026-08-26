import { App, FuzzySuggestModal } from "obsidian";

export function suggestItem<T>(
  app: App,
  placeholder: string,
  items: T[],
  getItemText: (item: T) => string,
): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new (class extends FuzzySuggestModal<T> {
      getItems(): T[] {
        return items;
      }

      getItemText(item: T): string {
        return getItemText(item);
      }

      onChooseItem(item: T) {
        if (settled) return;
        settled = true;
        resolve(item);
      }

      onClose() {
        if (settled) return;
        settled = true;
        resolve(null);
      }
    })(app);
    modal.setPlaceholder(placeholder);
    modal.open();
  });
}
