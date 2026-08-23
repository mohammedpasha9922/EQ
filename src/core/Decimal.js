/**
 * Shared Decimal Wrapper
 * Provides a consistent Decimal implementation across all calculator modes.
 * Uses decimal.js from CDN when available, with a built-in fallback class.
 */

const DecimalCtor = typeof globalThis !== 'undefined' && globalThis.Decimal
  ? globalThis.Decimal
  : (typeof window !== 'undefined' ? window.Decimal : null);

const FallbackDecimal = class {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return String(this.value);
  }
  add(other) { return new this.constructor(Number(this.value) + Number(other?.toString?.() || other)); }
  sub(other) { return new this.constructor(Number(this.value) - Number(other?.toString?.() || other)); }
  mul(other) { return new this.constructor(Number(this.value) * Number(other?.toString?.() || other)); }
  div(other) { return new this.constructor(Number(this.value) / Number(other?.toString?.() || other)); }
  neg() { return new this.constructor(-Number(this.value)); }
  pow(other) { return new this.constructor(Math.pow(Number(this.value), Number(other?.toString?.() || other))); }
  sqrt() { return new this.constructor(Math.sqrt(Number(this.value))); }
  isZero() { return Number(this.value) === 0; }
  toFixed() { return String(Number(this.value).toFixed()); }
};

export const Decimal = DecimalCtor || FallbackDecimal;

export default Decimal;