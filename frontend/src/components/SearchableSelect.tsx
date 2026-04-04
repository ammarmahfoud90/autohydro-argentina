import { useState, useRef, useEffect } from 'react';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export interface SelectOption {
  value: string;
  label: string;
}

export interface OptionGroup {
  label: string;
  options: SelectOption[];
}

interface Props {
  groups: OptionGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  footerOption?: SelectOption;
}

export function SearchableSelect({
  groups,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  disabled = false,
  footerOption,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // Escape key closes panel
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Resolve display label for current value
  const displayLabel = (() => {
    if (footerOption && value === footerOption.value) return footerOption.label;
    for (const g of groups) {
      const opt = g.options.find((o) => o.value === value);
      if (opt) return opt.label;
    }
    return '';
  })();

  // Filter groups by query (accent-insensitive, matches name or province)
  const q = normalize(query);
  const filteredGroups = q
    ? groups
        .map((g) => ({
          ...g,
          options: g.options.filter(
            (o) => normalize(o.label).includes(q) || normalize(g.label).includes(q)
          ),
        }))
        .filter((g) => g.options.length > 0)
    : groups;

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={[
          'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm shadow-sm text-left transition-colors',
          disabled
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-blue-400 cursor-pointer',
          open ? 'ring-2 ring-blue-500 border-blue-500' : '',
        ].join(' ')}
      >
        <span className={value && displayLabel ? 'text-gray-800 truncate' : 'text-gray-400 truncate'}>
          {displayLabel || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 bg-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 italic">
                Sin resultados para &ldquo;{query}&rdquo;
              </div>
            ) : (
              filteredGroups.map((g) => (
                <div key={g.label}>
                  <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider select-none">
                    {g.label}
                  </div>
                  {g.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => select(opt.value)}
                      className={[
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        opt.value === value
                          ? 'bg-blue-100 text-blue-900 font-medium'
                          : 'text-gray-700 hover:bg-blue-50',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer option — always visible */}
          {footerOption && (
            <div className="border-t border-gray-100">
              <button
                type="button"
                onClick={() => select(footerOption.value)}
                className={[
                  'w-full text-left px-4 py-2.5 text-sm transition-colors',
                  footerOption.value === value
                    ? 'bg-blue-100 text-blue-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {footerOption.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
