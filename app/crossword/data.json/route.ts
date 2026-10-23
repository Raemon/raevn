import { NextResponse } from 'next/server';
import { crossword } from '../crosswordSvg';

// The whole crossword as JSON (grid, every entry, clue, guest and table) for
// other tools and AIs that want to print or re-render it.

export function GET() {
  return NextResponse.json(crossword, { headers: { 'Access-Control-Allow-Origin': '*' } });
}
