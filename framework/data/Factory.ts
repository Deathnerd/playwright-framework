export type SequenceFunction<T> = (n: number) => Partial<T>;

export class Factory<T extends object> {
  private sequence = 0;
  private sequenceFn?: SequenceFunction<T>;

  constructor(private readonly defaults: T) {}

  build(overrides: Partial<T> = {}): T {
    this.sequence++;
    const sequenceOverrides = this.sequenceFn ? this.sequenceFn(this.sequence) : {};
    return { ...this.defaults, ...sequenceOverrides, ...overrides };
  }

  buildMany(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  withSequence(fn: SequenceFunction<T>): Factory<T> {
    const newFactory = new Factory(this.defaults);
    newFactory.sequenceFn = fn;
    return newFactory;
  }

  resetSequence(): void {
    this.sequence = 0;
  }
}
