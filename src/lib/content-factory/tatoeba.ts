import { contentHash } from "../content-pipeline/hash.ts";
export function normalizeTatoebaPair(row: string, maximumWords = 12) {
  const columns = row.split("\t");
  if (
    columns.length !== 3 ||
    !Number.isInteger(maximumWords) ||
    maximumWords < 1 ||
    maximumWords > 40
  )
    return null;
  const [english, german, attribution] = columns;
  if (
    !english.trim() ||
    !german.trim() ||
    english.length > 1000 ||
    german.length > 1000 ||
    german.trim().split(/\s+/u).length > maximumWords
  )
    return null;
  const match =
    /^CC-BY 2\.0 \(France\) Attribution: tatoeba\.org #([1-9]\d*) \(([^()]+)\) & #([1-9]\d*) \(([^()]+)\)$/.exec(
      attribution,
    );
  if (!match) return null; // Do not guess authors or license from an unattributed row.
  const [, enId, enAuthor, deId, deAuthor] = match;
  return {
    schemaVersion: 1,
    id: `tatoeba-de-${deId}-en-${enId}`,
    canonicalSentenceId: `tatoeba-de-${deId}`,
    status: "needs_review",
    cefr: null,
    topics: [],
    text: {
      de: german.trim().normalize("NFC"),
      en: english.trim().normalize("NFC"),
      ar: null,
    },
    source: {
      provider: "tatoeba",
      exportProvider: "manythings",
      germanId: deId,
      englishId: enId,
      germanAuthor: deAuthor,
      englishAuthor: enAuthor,
      germanUrl: `https://tatoeba.org/en/sentences/show/${deId}`,
      englishUrl: `https://tatoeba.org/en/sentences/show/${enId}`,
      exportUrl: "https://www.manythings.org/anki/deu-eng.zip",
      revision: null,
      licenseClaim: "CC-BY-2.0-FR",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
      attribution,
      rowHash: contentHash(row),
      rawRow: row,
    },
    rightsCleared: false,
    audio: null,
    reviewWarnings: [
      "Check the exact source sentence, author, current license and translation link before reuse.",
      "Short text does not establish a CEFR level; review naturalness, context, suitability and level.",
      "Arabic translation missing; author and review it.",
      "No audio is imported or licensed by this text export.",
    ],
  };
}
