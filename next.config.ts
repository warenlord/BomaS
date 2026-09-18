import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dossier utilisateur contient un package-lock.json sans rapport avec ce
  // projet ; on fixe explicitement la racine pour éviter que Next.js ne la
  // déduise incorrectement.
  outputFileTracingRoot: path.join(__dirname),
  // pdf-parse (via pdfjs-dist) doit s'exécuter tel quel sous Node.js : bundlé
  // par Webpack, il résout par erreur sa variante navigateur et plante avec
  // "DOMMatrix is not defined" en production.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
