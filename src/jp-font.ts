/**
 * Japanese font for UIKit panels.
 *
 * UIKit's bundled font (Inter) has no Japanese glyphs, and UIKitML's
 * `@font-face` only bakes ASCII. We bake our own atlas from a subset of
 * Noto Sans JP with exactly the characters the app shows
 * (tools/build-font.py writes both the font and the charset).
 */

import { TTFLoader } from '@pmndrs/uikit';
import { JP_CHARSET } from './generated/jp-charset.js';

export const JP_FAMILY = 'jp';

const FONT_URL = `${import.meta.env.BASE_URL}fonts/buzz-jp.ttf`;

type LoadedFonts = Awaited<ReturnType<TTFLoader['loadAsync']>>;
type FontFace = LoadedFonts[string][number];
export type JpFontFamilies = Record<typeof JP_FAMILY, Record<string, FontFace>>;

let pending: Promise<JpFontFamilies> | undefined;

function firstFace(loaded: LoadedFonts): FontFace {
  for (const family of Object.values(loaded)) {
    for (const face of Object.values(family)) {
      return face;
    }
  }
  throw new Error(`No font face in ${FONT_URL}`);
}

/** Bake the atlas once; every panel shares the result. */
export function loadJpFont(): Promise<JpFontFamilies> {
  pending ??= new TTFLoader()
    .loadAsync([
      {
        url: FONT_URL,
        charset: JP_CHARSET,
        fontSize: 48,
        textureSize: [2048, 2048],
      },
    ])
    .then((loaded) => {
      const face = firstFace(loaded);
      return { [JP_FAMILY]: { normal: face, medium: face, bold: face } };
    });
  return pending;
}
