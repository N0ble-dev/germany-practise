const small = [
  "null",
  "eins",
  "zwei",
  "drei",
  "vier",
  "fünf",
  "sechs",
  "sieben",
  "acht",
  "neun",
  "zehn",
  "elf",
  "zwölf",
  "dreizehn",
  "vierzehn",
  "fünfzehn",
  "sechzehn",
  "siebzehn",
  "achtzehn",
  "neunzehn",
];
const tens = [
  "",
  "",
  "zwanzig",
  "dreißig",
  "vierzig",
  "fünfzig",
  "sechzig",
  "siebzig",
  "achtzig",
  "neunzig",
];
export function germanNumber(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 100)
    throw new RangeError("This A1 exercise uses whole numbers from 0 to 100.");
  if (value < 20) return small[value];
  if (value === 100) return "hundert";
  const unit = value % 10;
  return `${unit ? (unit === 1 ? "ein" : small[unit]) + "und" : ""}${tens[Math.floor(value / 10)]}`;
}
