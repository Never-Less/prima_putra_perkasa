"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPendingUnsavedChangesConfirmation,
  resolveUnsavedChangesConfirmation,
  subscribeUnsavedChangesConfirmation,
  type UnsavedChangesConfirmationRequest,
} from "../_hooks/use-unsaved-changes-warning";
import { useI18n } from "../_i18n/provider";
import { ConfirmationModal } from "./confirmation-modal";

export function UnsavedChangesModal() {
  const router = useRouter();
  const { t } = useI18n();
  const [request, setRequest] = useState<UnsavedChangesConfirmationRequest | null>(() =>
    getPendingUnsavedChangesConfirmation()
  );

  useEffect(() => {
    return subscribeUnsavedChangesConfirmation(() => {
      setRequest(getPendingUnsavedChangesConfirmation());
    });
  }, []);

  function handleCancel() {
    resolveUnsavedChangesConfirmation(false);
  }

  function handleConfirm() {
    const nextHref = request?.href;
    const isExternal = request?.isExternal;

    resolveUnsavedChangesConfirmation(true);

    if (!nextHref) {
      return;
    }

    if (isExternal) {
      window.location.assign(nextHref);
      return;
    }

    router.push(nextHref);
  }

  return (
    <ConfirmationModal
      isOpen={Boolean(request)}
      title={t("common.unsavedChangesTitle")}
      description={request?.message || t("common.unsavedChangesDescription")}
      confirmLabel={t("common.leaveForm")}
      cancelLabel={t("common.stayOnForm")}
      variant="danger"
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    />
  );
}
