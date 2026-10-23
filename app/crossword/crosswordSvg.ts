import crosswordData from './crossword.json';

// The handfasting crossword, laid out once from the hosts' Clues tab and the
// seating chart. crossword.json is the source of truth: the page, the SVGs
// and /crossword/data.json all read from it, so other tools can print from
// the same layout.

export type CrosswordEntry = {
  number: number;
  direction: 'across' | 'down';
  row: number;
  col: number;
  length: number;
  answer: string;
  answerAsWritten: string;
  theme: boolean;
  clue: string | null;
  clueGivenTo: string | null;
  table: string | null;
  tableNumber: number | null;
  whoKnows: string | null;
};

export type Crossword = {
  title: string;
  event: string;
  howItWorks: string;
  fields: Record<string, string>;
  source: string;
  grid: { width: number; height: number; solution: string[] };
  entries: CrosswordEntry[];
};

export const crossword = crosswordData as Crossword;

const CELL = 50;
const MARGIN = 4;

// White squares on black, with clue numbers in the corners. withAnswers
// fills in the letters for the solved version.
export function crosswordSvg(withAnswers: boolean): string {
  const { width, height, solution } = crossword.grid;
  const numbers = new Map(crossword.entries.map((e) => [`${e.row},${e.col}`, e.number]));
  const parts: string[] = [];
  solution.forEach((rowText, row) => {
    [...rowText].forEach((ch, col) => {
      if (ch === '.') return;
      const x = col * CELL;
      const y = row * CELL;
      parts.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="#fff" stroke="#111" stroke-width="1.5"/>`);
      const number = numbers.get(`${row},${col}`);
      if (number !== undefined) {
        parts.push(`<text x="${x + 3}" y="${y + 12}" font-size="11" fill="#111">${number}</text>`);
      }
      if (withAnswers) {
        parts.push(`<text x="${x + CELL / 2}" y="${y + CELL * 0.72}" font-size="28" font-weight="600" text-anchor="middle" fill="#111">${ch}</text>`);
      }
    });
  });
  const w = width * CELL + MARGIN * 2;
  const h = height * CELL + MARGIN * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-MARGIN} ${-MARGIN} ${w} ${h}" width="${w}" height="${h}" font-family="Helvetica, Arial, sans-serif"><title>${crossword.title.replace(/&/g, '&amp;')}${withAnswers ? ' (solved)' : ''}</title><rect x="${-MARGIN}" y="${-MARGIN}" width="${w}" height="${h}" fill="#111"/>${parts.join('')}</svg>`;
}
