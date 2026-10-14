import { expect, type Page } from "@playwright/test";

/** Sonner may render duplicate toasts; use the first match. */
export async function expectVisibleText(page: Page, pattern: RegExp) {
  await expect(page.getByText(pattern).first()).toBeVisible();
}

export async function expectApiErrorVisible(page: Page) {
  await expectVisibleText(page, /something went wrong|failed|unable|error|try again/i);
}
