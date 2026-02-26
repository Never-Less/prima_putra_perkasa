"use client";

type AutocompleteModalProps = {
  isOpen: boolean;
  title: string;
  placeholder: string;
  query: string;
  options: string[];
  selectedValue?: string;
  useTypedLabel: string;
  emptyLabel: string;
  closeLabel: string;
  onQueryChange: (value: string) => void;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function AutocompleteModal({
  isOpen,
  title,
  placeholder,
  query,
  options,
  selectedValue = "",
  useTypedLabel,
  emptyLabel,
  closeLabel,
  onQueryChange,
  onSelect,
  onClose,
}: AutocompleteModalProps) {
  const normalizedQuery = normalize(query);
  const normalizedSelectedValue = normalize(selectedValue);
  const filteredOptions = normalizedQuery
    ? options.filter((option) => normalize(option).includes(normalizedQuery))
    : options;
  const canUseTypedValue =
    query.trim().length > 0 && !options.some((option) => normalize(option) === normalizedQuery);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop-enter fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/35 p-4">
      <div className="modal-panel-enter w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

        <input
          autoFocus
          value={query}
          placeholder={placeholder}
          onChange={(event) => onQueryChange(event.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />

        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
          {filteredOptions.map((option) => {
            const isSelected = normalize(option) === normalizedSelectedValue;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  isSelected
                    ? "bg-sky-100 text-sky-900"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option}
              </button>
            );
          })}

          {canUseTypedValue ? (
            <button
              type="button"
              onClick={() => onSelect(query.trim())}
              className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 text-left text-sm text-sky-700 hover:bg-sky-50"
            >
              {useTypedLabel}
            </button>
          ) : null}

          {filteredOptions.length === 0 && !canUseTypedValue ? (
            <p className="px-2 py-1 text-sm text-slate-500">{emptyLabel}</p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
