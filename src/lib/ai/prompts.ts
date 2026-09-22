import { z } from "zod";

export const CHAT_SYSTEM_PROMPT = `Tu es l'assistant IA de BomaSchool, dédié à l'aide aux études pour les étudiants gabonais.
Ton rôle : aider à réviser, comprendre les cours, préparer les examens et répondre aux questions académiques.
Règles :
- Réponds en français, de façon claire, structurée et pédagogique.
- Adapte le niveau d'explication à un étudiant qui cherche à comprendre, pas seulement à obtenir une réponse.
- Utilise des exemples concrets quand c'est utile.
- Si la question sort du cadre académique/étude, réponds brièvement puis recentre poliment sur l'apprentissage.
- Ne donne jamais de réponse dangereuse, discriminatoire ou hors-sujet académique.`;

export function ragSystemPrompt(contextChunks: { documentTitle: string; content: string }[]) {
  const context = contextChunks.map((c, i) => `[Extrait ${i + 1} — ${c.documentTitle}]\n${c.content}`).join("\n\n");

  const documentTitles = [...new Set(contextChunks.map((c) => c.documentTitle))];
  const subject =
    documentTitles.length === 1
      ? `du document "${documentTitles[0]}"`
      : `des documents suivants : ${documentTitles.map((t) => `"${t}"`).join(", ")}`;

  return `${CHAT_SYSTEM_PROMPT}

Tu réponds ici à propos ${subject}. Utilise UNIQUEMENT les extraits ci-dessous comme source de vérité. Si l'information n'y figure pas, dis-le clairement au lieu d'inventer.
Quand tu t'appuies sur un extrait, cite-le sous la forme (Extrait n).

${context}`;
}

// ---------------------------------------------------------------------------
// Schémas de sortie structurée pour les générateurs
// ---------------------------------------------------------------------------

const qcmQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

export const qcmSchema = z.object({
  title: z.string().min(1),
  questions: z.array(qcmQuestionSchema).min(1),
});
export type QcmContent = z.infer<typeof qcmSchema>;

/** Variante avec un nombre de questions imposé strictement (utilisée pour la génération). */
export function qcmSchemaForCount(count: number) {
  return z.object({
    title: z.string().min(1),
    questions: z.array(qcmQuestionSchema).length(count),
  });
}

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

export const revisionSheetSectionTypes = ["definition", "principe", "formule", "exemple", "point_cle"] as const;

export const revisionSheetSchema = z.object({
  title: z.string().min(1),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        type: z.enum(revisionSheetSectionTypes),
        content: z.string().min(1),
      }),
    )
    .min(1),
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
        // .nullable() (pas .optional()) : le mode "structured outputs"
        // d'OpenAI exige que chaque champ soit présent (donc pas de champ
        // optionnel au sens JSON Schema), mais sa valeur peut être `null`
        // pour une question ouverte qui n'a pas d'options à choix multiple.
        options: z.array(z.string().min(1)).nullable(),
        correctIndex: z.number().int().nullable(),
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
    prompt: `À partir du contenu de cours suivant, crée un QCM de EXACTEMENT ${questionCount} questions (ni plus, ni moins).

Exigences de qualité, à respecter strictement :
- Les 3 mauvaises réponses (distracteurs) de chaque question doivent être plausibles et rester dans le même thème que la bonne réponse : elles doivent correspondre à des erreurs de compréhension réalistes (confusion entre deux notions proches, application incorrecte d'une règle, détail légèrement faux...), jamais des options absurdes, hors-sujet ou évidemment fausses.
- Varie la difficulté : environ un tiers de questions de restitution simple (définitions, faits directement dans le texte), un tiers qui demandent de relier plusieurs éléments du cours entre eux, et un tiers qui demandent d'appliquer ou raisonner sur la notion (pas seulement la réciter).
- Base-toi uniquement sur le contenu fourni ci-dessous, ne invente pas d'informations qui n'y figurent pas.
- L'explication de chaque question doit dire pourquoi la bonne réponse est correcte ET pourquoi les distracteurs les plus proches sont incorrects.

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
    prompt: `Transforme le contenu de cours suivant en fiche de révision, pensée pour tenir sur UNE SEULE page A4 : ne garde que l'essentiel, va droit au but, pas de remplissage ni de répétitions.

Chaque section a un type parmi : "definition", "principe", "formule", "exemple", "point_cle". Consignes par type :
- "definition" : les notions et termes clés du cours, définis en une phrase concise.
- "principe" : les règles, lois ou principes généraux énoncés dans le cours (le "pourquoi"/"comment" derrière les notions).
- "formule" : TOUTES les formules ou équations importantes du cours, si le sujet en comporte (maths, physique, chimie, économie...). Écris chaque formule clairement avec la signification de chaque variable. Si le cours n'a vraiment aucune formule (ex: littérature, histoire), omets ce type.
- "exemple" : au moins un exemple concret appliqué. Si le sujet s'y prête (maths, physique, chimie...), inclus un calcul complet, étape par étape, avec le résultat final — pas juste l'énoncé du problème.
- "point_cle" : ce qu'il faut absolument retenir pour un examen (synthèse, pièges fréquents, ordre de grandeur...).

N'invente rien : base-toi uniquement sur le contenu fourni. Si un type ne s'applique pas au sujet (ex: pas de formule en philosophie), ne crée pas de section vide pour ce type — omets-le simplement.

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
