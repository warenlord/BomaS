"use client";

import { motion } from "framer-motion";
import { MessageSquare, FileText, ListChecks, NotebookPen, ClipboardCheck, Layers } from "lucide-react";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Chat IA façon ChatGPT",
    description: "Discute avec l'IA, pose tes questions de cours, garde tout ton historique de conversations.",
  },
  {
    icon: FileText,
    title: "Analyse de PDF & Word",
    description: "Dépose tes cours, l'IA les lit et répond en citant les passages exacts du document.",
  },
  {
    icon: ListChecks,
    title: "QCM générés automatiquement",
    description: "10, 20 ou 50 questions avec corrections détaillées et score final instantané.",
  },
  {
    icon: Layers,
    title: "Flashcards & résumés",
    description: "Transforme n'importe quel cours en flashcards ou en résumé clair en quelques secondes.",
  },
  {
    icon: NotebookPen,
    title: "Fiches de révision",
    description: "Des fiches structurées, prêtes à réviser la veille d'un examen.",
  },
  {
    icon: ClipboardCheck,
    title: "Examens blancs",
    description: "Simule un vrai examen chronométré avec corrigés types et barème.",
  },
];

export function FeatureGrid() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tout ce qu&apos;il te faut pour réviser</h2>
        <p className="mt-4 text-muted-foreground">
          Un seul assistant IA pour comprendre, réviser et t&apos;entraîner avant tes examens.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <feature.icon className="size-5" />
            </div>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
