import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dossier utilisateur contient un package-lock.json sans rapport avec ce
  // projet ; on fixe explicitement la racine pour éviter que Next.js ne la
  // déduise incorrectement.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
