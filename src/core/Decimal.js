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
    // Keep the EXACT decimal string when built from a token/result string
    // so add/sub/mul can use scaled-integer math instead of binary floats
    // (fixes 0.1+0.2 -> 0.30000000000000004 offline). Non-numeric values
    // (Infinity/NaN) stay as Numbers for unified 'Error' handling.
    if (value instanceof FallbackDecimal) {
      this.value = value.value;
    } else if (typeof value === 'number') {
      this.value = value;
    } else {
      this.value = String(value);
    }
  }
  toString() {
    return String(this.value);
  }
  valueOf() {
    return Number(this.value);
  }
  static _parseDecimal(str) {
    const s = String(str).trim();
    if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(s)) return null;
    if (/[eE]/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      return { int: BigInt(Math.trunc(n)), scale: 0, inexact: true, num: n };
    }
    let neg = false;
    let t = s;
    if (t[0] === '+' || t[0] === '-') { neg = t[0] === '-'; t = t.slice(1); }
    const parts = t.split('.');
    const ip = parts[0] || '0';
    const fp = parts[1] || '';
    const scale = fp.length;
    const digits = (ip + fp).replace(/^0+(?=\d)/, '') || '0';
    try {
      const int = BigInt((neg ? '-' : '') + digits);
      return { int, scale, inexact: false };
    } catch (e) {
      return null;
    }
  }
  static _fromIntScale(int, scale) {
    const neg = int < 0n;
    let d = (neg ? -int : int).toString();
    let out;
    if (scale <= 0) {
      out = d + '0'.repeat(-scale);
    } else {
      while (d.length <= scale) d = '0' + d;
      const ip2 = d.slice(0, d.length - scale) || '0';
      let fp2 = d.slice(d.length - scale);
      fp2 = fp2.replace(/0+$/, '');
      out = fp2 ? (ip2 + '.' + fp2) : ip2;
    }
    out = out.replace(/^(-?)0+(?=\d)/, '$1');
    if (out.startsWith('.')) out = '0' + out;
    if (out.startsWith('-.')) out = '-0' + out.slice(1);
    return new FallbackDecimal((neg ? '-' : '') + out);
  }
  static _numbers(a, b) {
    const x = Number(a?.toString?.() ?? a);
    const y = Number(b?.toString?.() ?? b);
    return [x, y];
  }
  static _cleanFloat(n) {
    // Conservative float-noise cleanup for fallback ONLY: 12 significant
    // digits strips binary artifacts (0.30000000000000004 -> 0.3) while
    // genuine digits (1/3, trig) survive.
    if (!Number.isFinite(n)) return n;
    if (n === 0) return 0;
    return Number(n.toPrecision(12));
  }
  add(other) {
    const a = FallbackDecimal._parseDecimal(this.toString());
    const b = FallbackDecimal._parseDecimal(other?.toString?.() ?? other);
    if (a && b && !a.inexact && !b.inexact) {
      const scale = Math.max(a.scale, b.scale);
      const ai = a.int * (10n ** BigInt(scale - a.scale));
      const bi = b.int * (10n ** BigInt(scale - b.scale));
      return FallbackDecimal._fromIntScale(ai + bi, scale);
    }
    const xy = FallbackDecimal._numbers(this, other);
    return new this.constructor(FallbackDecimal._cleanFloat(xy[0] + xy[1]));
  }
  sub(other) {
    const a = FallbackDecimal._parseDecimal(this.toString());
    const b = FallbackDecimal._parseDecimal(other?.toString?.() ?? other);
    if (a && b && !a.inexact && !b.inexact) {
      const scale = Math.max(a.scale, b.scale);
      const ai = a.int * (10n ** BigInt(scale - a.scale));
      const bi = b.int * (10n ** BigInt(scale - b.scale));
      return FallbackDecimal._fromIntScale(ai - bi, scale);
    }
    const xy = FallbackDecimal._numbers(this, other);
    return new this.constructor(FallbackDecimal._cleanFloat(xy[0] - xy[1]));
  }
  mul(other) {
    const a = FallbackDecimal._parseDecimal(this.toString());
    const b = FallbackDecimal._parseDecimal(other?.toString?.() ?? other);
    if (a && b && !a.inexact && !b.inexact) {
      try {
        return FallbackDecimal._fromIntScale(a.int * b.int, a.scale + b.scale);
      } catch (e) { /* fall through to float */ }
    }
    const xy = FallbackDecimal._numbers(this, other);
    return new this.constructor(FallbackDecimal._cleanFloat(xy[0] * xy[1]));
  }
  div(other) {
    const xy = FallbackDecimal._numbers(this, other);
    return new this.constructor(FallbackDecimal._cleanFloat(xy[0] / xy[1]));
  }
  neg() {
    const p = FallbackDecimal._parseDecimal(this.toString());
    if (p && !p.inexact) return FallbackDecimal._fromIntScale(-p.int, p.scale);
    return new this.constructor(FallbackDecimal._cleanFloat(-Number(this.toString())));
  }
  pow(other) {
    const xy = FallbackDecimal._numbers(this, other);
    return new this.constructor(FallbackDecimal._cleanFloat(Math.pow(xy[0], xy[1])));
  }
  sqrt() {
    // Math.sqrt is correctly rounded by IEEE-754 — there is NO binary noise
    // here for _cleanFloat to remove. Trimming it to 12 digits instead
    // COMPOUNDS error when the caller raises the result back:
    // sqrt(2) -> 1.41421356237 -> pow -> 1.99999999999 (false decimal).
    // Keeping the full-precision sqrt lets pow's own cleanup land on the
    // exact result: sqrt(2)^2 -> 2.0000000000000004 -> 2.
    return new this.constructor(Math.sqrt(Number(this.toString())));
  }
  isZero() { return Number(this.value) === 0; }
  toFixed(digits) {
    // Mirror decimal.js toFixed(digits?) + legacy no-arg expansion call used
    // by the evaluator to expand e-notation. No UI/display change.
    if (digits === undefined || digits === null) {
      const raw = String(this.value);
      if (!raw.includes('e') && !raw.includes('E')) return raw;
      const n = Number(raw);
      if (!Number.isFinite(n)) return raw;
      const parts = raw.toLowerCase().split('e');
      const exp = parseInt(parts[1], 10);
      const m = parts[0];
      const neg = m.startsWith('-');
      const mm = neg ? m.slice(1) : m;
      const segs = mm.split('.');
      const ipp = segs[0] || '0';
      const fpp = segs[1] || '';
      const all = (ipp + fpp).replace(/^0+(?=\d)/, '') || '0';
      const pointPos = ipp.length + exp;
      let out;
      if (pointPos <= 0) out = '0.' + '0'.repeat(-pointPos) + all;
      else if (pointPos >= all.length) out = all + '0'.repeat(pointPos - all.length);
      else out = all.slice(0, pointPos) + '.' + all.slice(pointPos);
      out = out.replace(/\.?0+$/, '').replace(/\.$/, '') || '0';
      return (neg && out !== '0' ? '-' : '') + out;
    }
    return String(FallbackDecimal._cleanFloat(Number(this.value)).toFixed(Number(digits)));
  }
};

export const Decimal = DecimalCtor || FallbackDecimal;

export default Decimal;