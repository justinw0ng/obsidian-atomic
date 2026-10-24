import type { CoverRect } from "./mount";

export type BookChooserRequest = {
  notePath: string;
  title: string;
  coverRect: CoverRect;
  ownerDocument: Document;
};

type Presenter = (request: BookChooserRequest) => void;

let presenter: Presenter | null = null;

export function registerBookChooser(next: Presenter): void {
  presenter = next;
}

export function presentBookChooser(request: BookChooserRequest): void {
  presenter?.(request);
}
