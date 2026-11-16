// Brand fonts for the PDF. They live in assets/fonts at the app root; the default path reads them as a
// literal join, so Next.js output tracing still copies them into the deployment bundle.
import { Font } from "@react-pdf/renderer";
import path from "node:path";
import { fonts } from "../theme";

const DEFAULT_DIR = path.join(process.cwd(), "assets", "fonts");
let registered = false;

/** Registers Baloo 2 and Plus Jakarta Sans once; `dir` overrides where the WOFF files are read from. */
export function registerAlbumFonts(dir: string = DEFAULT_DIR) {
  if (registered) return;
  registered = true;
  Font.register({
    family: fonts.display,
    fonts: [
      { src: path.join(dir, "baloo-2-latin-700-normal.woff"), fontWeight: 700 },
      { src: path.join(dir, "baloo-2-latin-800-normal.woff"), fontWeight: 800 },
    ],
  });
  Font.register({
    family: fonts.body,
    fonts: [
      { src: path.join(dir, "plus-jakarta-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(dir, "plus-jakarta-sans-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(dir, "plus-jakarta-sans-latin-700-normal.woff"), fontWeight: 700 },
      { src: path.join(dir, "plus-jakarta-sans-latin-800-normal.woff"), fontWeight: 800 },
    ],
  });
  // Indonesian words are not hyphenated; wrap at spaces only, as the browser does.
  Font.registerHyphenationCallback((word) => [word]);
}
