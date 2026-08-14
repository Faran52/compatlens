/**
 * Index reads answer `| undefined` under `noUncheckedIndexedAccess`, which is right for source and noise in a test
 * that has just produced the list it is reading. These throw instead, so a wrong assumption fails as a named error
 * rather than as a confusing assertion further down.
 */

export const at = <T>(values: readonly T[], index: number): T => {
  const value = values[index];

  if (value === undefined) {
    throw new Error(`expected an element at ${String(index)}, got a list of ${String(values.length)}`);
  }

  return value;
};

export const first = <T>(values: readonly T[]): T => {
  return at(values, 0);
};
