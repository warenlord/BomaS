import type {
  InitPaymentParams,
  InitPaymentResult,
  PaymentProvider,
  PaymentWebhookStatus,
  WebhookVerificationResult,
} from "@/lib/billing/provider";

/**
 * Implémentation SingPay (fintech gabonaise, Mobile Money Airtel/Moov).
 * Référence API : https://client.singpay.ga/doc/reference/index.html
 *
 * On utilise l'endpoint `/ext`, qui renvoie un lien vers l'interface de
 * paiement hébergée par SingPay (l'utilisateur y choisit Airtel/Moov et
 * confirme via USSD push) : on n'a donc pas à gérer nous-mêmes la saisie du
 * numéro ou le choix de l'opérateur.
 *
 * SingPay ne documente aucun schéma de signature pour son webhook. Plutôt
 * que de faire confiance au statut annoncé dans le payload reçu, on ne s'en
 * sert que pour retrouver la référence, puis on interroge nous-mêmes l'API
 * SingPay (`/transaction/api/search/by-reference/:reference`) avec nos
 * identifiants marchands pour obtenir le statut réel — impossible à falsifier
 * en forgeant une requête vers notre webhook.
 */
class SingpayProvider implements PaymentProvider {
  private get baseUrl() {
    return process.env.SINGPAY_API_BASE_URL || "https://gateway.singpay.ga/v1";
  }
  private get clientId() {
    return process.env.SINGPAY_CLIENT_ID;
  }
  private get clientSecret() {
    return process.env.SINGPAY_CLIENT_SECRET;
  }
  private get walletId() {
    return process.env.SINGPAY_WALLET_ID;
  }

  private get authHeaders(): Record<string, string> {
    return {
      "x-client-id": this.clientId ?? "",
      "x-client-secret": this.clientSecret ?? "",
      "x-wallet": this.walletId ?? "",
    };
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.walletId);
  }

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    if (!this.isConfigured()) {
      throw new Error("SINGPAY_NOT_CONFIGURED");
    }

    const successUrl = new URL(params.returnUrl);
    successUrl.searchParams.set("payment", "success");
    const errorUrl = new URL(params.returnUrl);
    errorUrl.searchParams.set("payment", "failed");

    const response = await fetch(`${this.baseUrl}/ext`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders },
      body: JSON.stringify({
        portefeuille: this.walletId,
        reference: params.reference,
        amount: params.amountFcfa,
        redirect_success: successUrl.toString(),
        redirect_error: errorUrl.toString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`SINGPAY_INIT_FAILED (${response.status})`);
    }

    const data = (await response.json()) as { link: string; exp: string };

    return {
      checkoutUrl: data.link,
      // SingPay ne renvoie l'ID interne de la transaction qu'une fois celle-ci
      // traitée : on utilise notre propre référence en attendant, elle est
      // remplacée par le véritable ID lors de la vérification du webhook.
      providerTransactionId: params.reference,
    };
  }

  async verifyWebhook(rawBody: string): Promise<WebhookVerificationResult> {
    if (!this.isConfigured()) {
      throw new Error("SINGPAY_NOT_CONFIGURED");
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { isValid: false, reference: "", providerTransactionId: "", status: "pending", rawPayload: rawBody };
    }

    const transactionPayload = (payload.transaction as Record<string, unknown> | undefined) ?? payload;
    const reference = (transactionPayload.reference as string | undefined) ?? (payload.reference as string | undefined);

    if (!reference) {
      return { isValid: false, reference: "", providerTransactionId: "", status: "pending", rawPayload: payload };
    }

    const response = await fetch(`${this.baseUrl}/transaction/api/search/by-reference/${encodeURIComponent(reference)}`, {
      headers: this.authHeaders,
    });

    if (!response.ok) {
      return { isValid: false, reference, providerTransactionId: "", status: "pending", rawPayload: payload };
    }

    const transaction = (await response.json()) as {
      id?: string;
      reference: string;
      status: string;
      result?: string;
    };

    let status: PaymentWebhookStatus = "pending";
    if (transaction.status === "Terminate") {
      status = transaction.result === "Success" ? "success" : "failed";
    }

    return {
      isValid: true,
      reference: transaction.reference,
      providerTransactionId: transaction.id ?? reference,
      status,
      rawPayload: payload,
    };
  }
}

export const singpayProvider: PaymentProvider = new SingpayProvider();
