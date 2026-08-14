type ClassValue = string | false | null | undefined;

// Utility strings are written as multi-line lists so no class attribute runs past the line limit.
export const cx = (...values: readonly ClassValue[]): string => {
  return values.filter(Boolean).join(' ');
};
