"use client";

import { Search, X } from "lucide-react";
import { InputHTMLAttributes, ReactNode } from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name: what the switch turns on. */
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    // The padding widens the touch target to 44px without moving the track
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="-m-2 shrink-0 cursor-pointer rounded-full p-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&:focus-visible>span]:ring-4 [&:focus-visible>span]:ring-primary-100 dark:[&:focus-visible>span]:ring-primary-900"
    >
      <span
        className={`flex h-[26px] w-11 rounded-full p-0.5 transition-colors ${
          checked ? "bg-primary" : "bg-border-2"
        }`}
      >
        <span
          className={`size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-transform ${
            checked ? "translate-x-[18px]" : ""
          }`}
        />
      </span>
    </button>
  );
}

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  wrapperClassName = "",
  className = "",
  ...props
}: SearchInputProps) {
  return (
    <div
      className={`flex h-12 items-center gap-2.5 rounded-[14px] bg-surface-2 px-3.5 transition-[background-color,box-shadow] focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary-100 dark:focus-within:ring-primary-900 ${wrapperClassName}`}
    >
      <Search aria-hidden className="size-[18px] shrink-0 text-foreground-subtle" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-w-0 flex-1 bg-transparent text-body text-foreground placeholder:text-foreground-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden ${className}`}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Borrar búsqueda"
          className="-mr-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-subtle hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex rounded-control bg-surface-2 p-[3px] ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex h-[34px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-meta font-semibold transition-colors ${
              active
                ? "bg-surface text-foreground shadow-card"
                : "text-foreground-subtle hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface FilterChip<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface FilterChipsProps<T extends string> {
  chips: FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}

/** One row of filters that scrolls sideways; the active one is inverted. */
export function FilterChips<T extends string>({
  chips,
  value,
  onChange,
  label,
  className = "",
}: FilterChipsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <button
            key={chip.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(chip.value)}
            className={`flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-meta font-semibold transition-colors ${
              active
                ? "border-inverse bg-inverse text-inverse-foreground"
                : "border-border-2 bg-surface text-foreground-muted hover:text-foreground"
            }`}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span className="font-mono font-medium tabular-nums opacity-60">
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
