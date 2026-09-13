"use client";

import { ChevronDown } from "lucide-react";
import { SelectHTMLAttributes, forwardRef } from "react";
import { sheetInputClasses } from "./sheet";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** For the wrapper, which is what a flex row sizes: "flex-1", "w-40"… */
  wrapperClassName?: string;
}

/**
 * Native select with the app's own arrow.
 *
 * The browser's default arrow sits flush against the right border and ignores
 * the field's padding, which looks broken next to every other input. Hiding it
 * with appearance-none and drawing our own chevron is the only way to line it
 * up, while keeping the native picker (and the phone's wheel) intact.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className = "", wrapperClassName = "", children, ...props }, ref) {
    return (
      <div className={`relative ${wrapperClassName}`}>
        <select
          ref={ref}
          {...props}
          className={`${sheetInputClasses} cursor-pointer appearance-none pr-9 ${className}`}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle"
        />
      </div>
    );
  }
);
