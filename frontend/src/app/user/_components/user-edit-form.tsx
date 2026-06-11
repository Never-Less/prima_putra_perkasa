"use client";

import { useMemo, useState } from "react";
import { useCurrentUserId } from "../../_hooks/use-current-user";
import { useI18n } from "../../_i18n/provider";
import { toUserFormState, userRoleOptions, type UserFormState, type UserItem, type UserRole } from "../_lib/user";

type UserEditFormProps = {
  item?: UserItem;
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  onSave?: (form: UserFormState, selectedItem?: UserItem) => Promise<void> | void;
  onDelete?: (selectedItem: UserItem) => Promise<void> | void;
};

function createEmptyUserFormState(): UserFormState {
  return {
    username: "",
    password: "",
    role: "staff",
  };
}

export function UserEditForm({
  item,
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onSave,
  onDelete,
}: UserEditFormProps) {
  const { t } = useI18n();
  const currentUserId = useCurrentUserId();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const [form, setForm] = useState<UserFormState>(() =>
    item ? toUserFormState(item) : createEmptyUserFormState()
  );
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  const roleLabelMap = useMemo(
    () =>
      new Map<UserRole, string>([
        ["admin", t("user.role.admin")],
        ["staff", t("user.role.staff")],
      ]),
    [t]
  );

  const previewPassword = form.password.trim() ? "********" : t("user.preview.passwordHidden");
  const isCurrentUser = Boolean(item?.id && item.id === currentUserId);

  const passwordVisibilityIcon = showPassword ? (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
      <path d="M9.88 5.09A9.77 9.77 0 0 1 12 5c5 0 9.27 3.11 11 7-1 2.25-2.73 4.16-4.88 5.3" />
      <path d="M6.61 6.61C4.62 7.87 3.06 9.72 2 12c1.73 3.89 6 7 10 7 1.53 0 2.98-.29 4.3-.82" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  function resetFormState(nextForm: UserFormState) {
    setForm(nextForm);
    setConfirmPassword("");
    setShowPassword(false);
    setValidationError("");
  }

  function validatePasswordConfirmation() {
    const password = form.password.trim();
    const confirmation = confirmPassword.trim();

    if (!password && !confirmation) {
      return "";
    }

    if (!password || !confirmation) {
      return t("user.form.confirmPasswordRequired");
    }

    if (password !== confirmation) {
      return t("user.form.passwordMismatch");
    }

    return "";
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("user.form.title")}</h2>
        <p className="text-sm text-sky-800 dark:text-sky-200">{t("user.form.description")}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-3">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.username")}
              <input
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder={inputPlaceholder("field.username")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.password")}
              {item ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("user.form.passwordOptionalHint")}
                </p>
              ) : null}
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => {
                    setValidationError("");
                    setForm((prev) => ({ ...prev, password: event.target.value }));
                  }}
                  placeholder={inputPlaceholder("field.password")}
                  className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 pr-12 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t("user.form.hidePassword") : t("user.form.showPassword")}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  {passwordVisibilityIcon}
                </button>
              </div>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.confirmPassword")}
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setValidationError("");
                    setConfirmPassword(event.target.value);
                  }}
                  placeholder={inputPlaceholder("field.confirmPassword")}
                  className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 pr-12 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t("user.form.hidePassword") : t("user.form.showPassword")}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  {passwordVisibilityIcon}
                </button>
              </div>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.role")}
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    role: event.target.value as UserRole,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {userRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {roleLabelMap.get(role) || role}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => {
                const passwordValidationError = validatePasswordConfirmation();

                if (passwordValidationError) {
                  setValidationError(passwordValidationError);
                  return;
                }

                setValidationError("");
                void onSave?.(form, item);
              }}
              disabled={isSaving || isDeleting}
              className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:w-auto"
            >
              {isSaving ? t("common.loading") : t("common.saveChanges")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => resetFormState(item ? toUserFormState(item) : createEmptyUserFormState())}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.resetForm")}
            </button>
            {item ? (
              <button
                type="button"
                onClick={() => void onDelete?.(item)}
                disabled={isSaving || isDeleting || isCurrentUser}
                className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </button>
            ) : null}
          </div>
          {isCurrentUser ? (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t("user.currentUserDeleteDisabled")}</p>
          ) : null}
          {validationError ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {validationError}
            </p>
          ) : null}
          {actionErrorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {actionErrorMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("user.preview.title")}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.username")}:</span> {form.username || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.password")}:</span> {previewPassword}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.role")}:</span> {roleLabelMap.get(form.role) || form.role}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
