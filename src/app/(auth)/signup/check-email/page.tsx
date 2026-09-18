import { MailCheck } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="size-6" />
      </div>
      <h1 className="text-xl font-semibold">Vérifie ta boîte mail</h1>
      <p className="text-sm text-muted-foreground">
        Nous t&apos;avons envoyé un lien de confirmation. Clique dessus pour activer ton compte BomaSchool et commencer à
        réviser.
      </p>
    </div>
  );
}
