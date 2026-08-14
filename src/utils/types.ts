// Counts by growing a tuple, because a tuple's length is the only number TypeScript can increment.
type Enumerate<Length extends number, Counted extends number[] = []>
  = Counted['length'] extends Length
    ? Counted[number]
    : Enumerate<Length, [...Counted, Counted['length']]>;

// Both ends included, so IntRange<1, 15> reads as the range it names.
export type IntRange<From extends number, To extends number>
  = Exclude<Enumerate<To>, Enumerate<From>> | To;
