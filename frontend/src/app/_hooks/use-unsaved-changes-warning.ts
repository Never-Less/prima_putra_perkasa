"use client";

import { useEffect, useRef } from "react";

const fallbackMessage = "Ada perubahan yang belum disimpan. Keluar dari form?";

let isWarningEnabled = false;
let warningMessage = fallbackMessage;

function getAnchorFromEvent(event: MouseEvent) {
  const target = event.target;
  return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
}

function shouldSkipAnchor(anchor: HTMLAnchorElement, event: MouseEvent) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    anchor.hasAttribute("download") ||
    Boolean(anchor.target && anchor.target !== "_self")
  );
}

function isSameDocumentNavigation(url: URL) {
  return (
    url.origin === window.location.origin &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  );
}

export function confirmUnsavedChanges(message = warningMessage) {
  if (!isWarningEnabled) {
    return true;
  }

  return window.confirm(message || fallbackMessage);
}

export function serializeUnsavedChangesValue(value: unknown) {
  return JSON.stringify(value);
}

export function useUnsavedChangesWarning(enabled: boolean, message = fallbackMessage) {
  const enabledRef = useRef(enabled);
  const messageRef = useRef(message);

  useEffect(() => {
    enabledRef.current = enabled;
    messageRef.current = message;
    isWarningEnabled = enabled;
    warningMessage = message || fallbackMessage;

    return () => {
      if (enabledRef.current === enabled) {
        isWarningEnabled = false;
      }
    };
  }, [enabled, message]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!enabledRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!enabledRef.current) {
        return;
      }

      const anchor = getAnchorFromEvent(event);

      if (!anchor || shouldSkipAnchor(anchor, event)) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href || href.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(href, window.location.href);

      if (isSameDocumentNavigation(nextUrl)) {
        return;
      }

      if (window.confirm(messageRef.current || fallbackMessage)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);
}
