// Renders an album document to PDF bytes. Server-side only.
import { renderToBuffer } from "@react-pdf/renderer";
import AlbumPdf from "../pdf/AlbumPdf";
import { registerAlbumFonts } from "../pdf/fonts";
import type { AlbumImages } from "../images";
import type { AlbumDocument } from "../types";

export type RenderAlbumOptions = {
  /** Shown in the PDF's metadata as the producing application. */
  producer?: string;
  /** Where the brand fonts are read from; defaults to this package's assets/fonts under node_modules. */
  fontDir?: string;
};

export async function renderAlbumPdf(document: AlbumDocument, images: AlbumImages, { producer = "ClassPing", fontDir }: RenderAlbumOptions = {}) {
  registerAlbumFonts(fontDir);
  return renderToBuffer(<AlbumPdf document={document} images={images} producer={producer} />);
}
