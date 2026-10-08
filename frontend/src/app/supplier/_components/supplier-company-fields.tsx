"use client";

import { useId } from "react";
import { useI18n } from "../../_i18n/provider";
import { supplierTypes } from "../_lib/supplier-onboarding";

type CompanyFields = { legalCompanyName: string; supplierType: string; supplierTypeOther: string };

export function SupplierCompanyFields({ value, onChange, disabled, errors = {} }: {
  value: CompanyFields;
  onChange: (fields: CompanyFields) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}) {
  const { t } = useI18n();
  const id = useId();
  return <div className="grid gap-5 sm:col-span-2 sm:grid-cols-2">
    {(["legalCompanyName", "supplierType", ...(value.supplierType === "other" ? ["supplierTypeOther"] : [])] as (keyof CompanyFields)[]).map((name) => {
      const fieldId = `${id}-${name}`;
      const shared = { id: fieldId, name, disabled, value: value[name], "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${fieldId}-error` : undefined, className: "erp-field mt-2 w-full rounded-lg px-3 py-2.5 text-sm" };
      return <div key={name}>
        <label htmlFor={fieldId} className="text-sm font-medium">{t(`supplierOnboarding.${name}`)} <span className="text-xs text-slate-500">{name === "supplierTypeOther" ? "*" : `(${t("supplierOnboarding.optional")})`}</span></label>
        {name === "supplierType" ? <select {...shared} onChange={(event) => onChange({ ...value, supplierType: event.target.value, supplierTypeOther: "" })}>
          <option value="">{t("supplierOnboarding.selectSupplierType")}</option>
          {supplierTypes.map((type) => <option key={type} value={type}>{t(`supplierOnboarding.type.${type}`)}</option>)}
        </select> : <input {...shared} type="text" maxLength={name === "legalCompanyName" ? 150 : 100} required={name === "supplierTypeOther"} pattern={name === "supplierTypeOther" ? ".*\\S.*" : undefined} onChange={(event) => onChange({ ...value, [name]: event.target.value })} />}
        {name === "legalCompanyName" ? <p className="mt-1 text-xs text-slate-500">{t("supplierOnboarding.legalCompanyNameHint")}</p> : null}
        {errors[name] ? <p id={`${fieldId}-error`} className="mt-1 text-xs text-red-700 dark:text-red-300">{t(errors[name])}</p> : null}
      </div>;
    })}
  </div>;
}
