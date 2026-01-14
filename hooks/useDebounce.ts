import { useEffect, useState } from "react";

/**
 * Custom hook for debouncing values
 * Delays updating the debounced value until after the specified delay has passed
 * since the last time the source value was updated.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState("");
 * const debouncedSearch = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   // Only executes 300ms after user stops typing
 *   refetch({ search: debouncedSearch });
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
