"use client";

import { useEffect, useRef } from "react";

const fallbackMessage =
  "Perubahan di form ini belum disimpan. Kalau lanjut, perubahan tersebut akan hilang.";
const unsavedChangesConfirmationEvent = "ppp:unsaved-changes-confirmation";

let isWarningEnabled = false;
let warningMessage = fallbackMessage;
let confirmationId = 0;
let pendingConfirmation: UnsavedChangesConfirmationRequest | null = null;

export type UnsavedChangesConfirmationRequest = {
  id: number;
  message: string;
  href?: string;
  isExternal?: boolean;
  resolve: (confirmed: boolean) => void;
};

function emitConfirmationChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(unsavedChangesConfirmationEvent));
}

function toNavigationHref(url: URL) {
  if (url.origin !== window.location.origin) {
    return url.href;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

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

export function requestUnsavedChangesConfirmation(
  message = warningMessage,
  options: { href?: string; isExternal?: boolean } = {}
) {
  if (!isWarningEnabled) {
    return Promise.resolve(true);
  }

  if (pendingConfirmation) {
    pendingConfirmation.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    pendingConfirmation = {
      id: confirmationId + 1,
      message: message || fallbackMessage,
      href: options.href,
      isExternal: options.isExternal,
      resolve,
    };
    confirmationId += 1;
    emitConfirmationChange();
  });
}

export function getPendingUnsavedChangesConfirmation() {
  return pendingConfirmation;
}

export function subscribeUnsavedChangesConfirmation(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(unsavedChangesConfirmationEvent, listener);

  return () => {
    window.removeEventListener(unsavedChangesConfirmationEvent, listener);
  };
}

export function resolveUnsavedChangesConfirmation(confirmed: boolean) {
  const confirmation = pendingConfirmation;

  if (!confirmation) {
    return;
  }

  pendingConfirmation = null;
  confirmation.resolve(confirmed);
  emitConfirmationChange();
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

      event.preventDefault();
      event.stopPropagation();
      void requestUnsavedChangesConfirmation(messageRef.current || fallbackMessage, {
        href: toNavigationHref(nextUrl),
        isExternal: nextUrl.origin !== window.location.origin,
      });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);
}
