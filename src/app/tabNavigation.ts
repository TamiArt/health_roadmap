import type { KeyboardEvent } from "react";

/** Implements the WAI-ARIA tabs pattern with roving focus and automatic activation. */
export function handleTabListKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
  const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
  if (!keys.includes(event.key)) return;

  const tabList = event.currentTarget.closest('[role="tablist"]');
  const tabs = Array.from(tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex < 0 || tabs.length === 0) return;

  event.preventDefault();
  const isRtl = window.getComputedStyle(event.currentTarget).direction === "rtl";
  let nextIndex = currentIndex;

  if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else if (event.key === "ArrowRight") nextIndex = (currentIndex + (isRtl ? -1 : 1) + tabs.length) % tabs.length;
  else if (event.key === "ArrowLeft") nextIndex = (currentIndex + (isRtl ? 1 : -1) + tabs.length) % tabs.length;

  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}
