import { crosswordSvg } from '../crosswordSvg';

export function GET() {
  return new Response(crosswordSvg(true), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
}
