import { z } from "zod";

export const CHAT_SYSTEM_PROMPT = `Tu es l'assistant IA de BomaSchool, dédié à l'aide aux études pour les étudiants gabonais.
Ton rôle : aider à réviser, comprendre les cours, préparer les examens et répondre aux questions académiques.
Règles :
- Réponds en français, de façon claire, structurée et pédagogique.
- Adapte le niveau d'explication à un étudiant qui cherche à comprendre, pas seulement à obtenir une réponse.
- Utilise des exemples concrets quand c'est utile.
- Si la question sort du cadre académique/étude, réponds brièvement puis recentre poliment sur l'apprentissage.
- Ne donne jamais de réponse dangereuse, discriminatoire ou hors-sujet académique.`;

export function ragSystemPrompt(documentTitle: string, contextChunks: { index: number; content: string }[]) {
  const context = contextChunks
    .map((c) => `[Extrait ${c.index + 1}]\n${c.content}`)
    .join("\n\n");

  return `${CHAT_SYSTEM_PROMPT}

Tu réponds ici à propos du document "${documentTitle}". Utilise UNIQUEMENT les extraits ci-dessous comme source de vérité pour ce document. Si l'information n'y figure pas, dis-le clairement au lieu d'inventer.
Quand tu t'appuies sur un extrait, cite-le sous la forme (Extrait n).

${context}`;
}

// ---------------------------------------------------------------------------
// Schémas de sortie structurée pour les générateurs
// ---------------------------------------------------------------------------

export const qcmSchema = z.object({
  title: z.string().min(1),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(1),
      }),
    )
    .min(1),
});
export type QcmContent = z.infer<typeof qcmSchema>;

export const flashcardsSchema = z.object({
  title: z.string().min(1),
  cards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).min(1),
});
export type FlashcardsContent = z.infer<typeof flashcardsSchema>;

export const summarySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1),
});
export type SummaryContent = z.infer<typeof summarySchema>;

export const revisionSheetSchema = z.object({
  title: z.string().min(1),
  sections: z.array(z.object({ heading: z.string().min(1), content: z.string().min(1) })).min(1),
});
export type RevisionSheetContent = z.infer<typeof revisionSheetSchema>;

export const examSchema = z.object({
  title: z.string().min(1),
  durationMinutes: z.number().int().min(10),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        type: z.enum(["qcm", "open"]),
        // .nullish() plutôt que .optional() : le modèle renvoie parfois
        // explicitement `null` pour une question ouverte au lieu d'omettre
        // le champ, ce que .optional() seul rejette (undefined uniquement).
        options: z.array(z.string().min(1)).nullish(),
        correctIndex: z.number().int().nullish(),
        modelAnswer: z.string().min(1),
        points: z.number().min(0),
      }),
    )
    .min(1),
});
export type ExamContent = z.infer<typeof examSchema>;

export const memoireAnalysisSchema = z.object({
  title: z.string().min(1),
  strengths: z.array(z.string().min(1)).min(1),
  weaknesses: z.array(z.string().min(1)).min(1),
  structureReview: z.string().min(1),
  methodologyReview: z.string().min(1),
  recommendations: z.array(z.string().min(1)).min(1),
  overallScore: z.number().min(0).max(20),
});
export type MemoireAnalysisContent = z.infer<typeof memoireAnalysisSchema>;

// ---------------------------------------------------------------------------
// Prompts pour chaque générateur
// ---------------------------------------------------------------------------

const GENERATOR_SYSTEM_PROMPT = `Tu es le moteur de génération pédagogique de BomaSchool pour des étudiants gabonais.
Produis toujours du contenu en français, rigoureux, fidèle à la source fournie et pédagogiquement clair.`;

export function qcmPrompt(sourceText: string, questionCount: 10 | 20 | 50) {
  return {
    system: GENERATOR_SYSTEM_PROMPT,
    prompt: `À partir du contenu de cours suivant, crée un QCM de ${questionCount} questions. Chaque question doit avoir exactement 4 réponses possibles, une seule correcte, et une explication pédagogique de la bonne réponse.

Contenu de cours :
"""
${sourceText}
"""`,
  };
}

export function flashcardsPrompt(sourceText: string, cardCount = 15) {
  return {
    system: GENERATOR_SYSTEM_PROMPT,
    prompt: `À partir du contenu de cours suivant, crée environ ${cardCount} flashcards (recto = notion/question courte, verso = réponse/définition concise).

Contenu de cours :
"""
${sourceText}
"""`,
  };
}

export function summaryPrompt(sourceText: string) {
  return {
    system: GENERATOR_SYSTEM_PROMPT,
    prompt: `Résume le contenu de cours suivant de façon claire et structurée, puis liste les points clés à retenir.

Contenu de cours :
"""
${sourceText}
"""`,
  };
}

export function revisionSheetPrompt(sourceText: string) {
  return {
    system: GENERATOR_SYSTEM_PROMPT,
    prompt: `Transforme le contenu de cours suivant en fiche de révision structurée par sections (définitions, notions clés, exemples, points à retenir).

Contenu de cours :
"""
${sourceText}
"""`,
  };
}

export function examPrompt(sourceText: string, durationMinutes = 60) {
  return {
    system: GENERATOR_SYSTEM_PROMPT,
    prompt: `Crée un examen blanc de ${durationMinutes} minutes à partir du contenu de cours suivant. Mélange questions à choix multiples et questions ouvertes. Pour chaque question, fournis un corrigé type (modelAnswer) et un barème de points.

Contenu de cours :
"""
${sourceText}
"""`,
  };
}

export function memoireAnalysisPrompt(sourceText: string) {
  return {
    system: GENERATOR_SYSTEM_PROMPT,
    prompt: `Analyse ce mémoire/document académique en profondeur : points forts, points faibles, qualité de la structure, qualité de la méthodologie, recommandations concrètes d'amélioration, et une note globale sur 20.

Contenu du mémoire :
"""
${sourceText}
"""`,
  };
}
