export const toggleIn = <T>(values: ReadonlySet<T>, value: T): ReadonlySet<T> => {
  const next = new Set(values);

  if (!next.delete(value)) {
    next.add(value);
  }

  return next;
};
