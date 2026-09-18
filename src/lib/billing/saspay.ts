import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  InitPaymentParams,
  InitPaymentResult,
  PaymentProvider,
  PaymentWebhookStatus,
  WebhookVerificationResult,
} from "@/lib/billing/provider";

/**
 * Implémentation Saspay (agrégateur Mobile Money / carte pour le Gabon).
 *
 * ⚠️ IMPORTANT : l'API Saspay exacte (endpoints, format du payload, en-tête de
 * signature du webhook) n'était pas disponible au moment de l'implémentation.
 * Le code ci-dessous suit le schéma standard d'un agrégateur de paiement
 * ouest/centre-africain (init transaction → URL de redirection → webhook signé)
 * et DOIT être ajusté dès que la documentation marchande Saspay réelle est
 * fournie (voir points marqués TODO).
 */
class SaspayProvider implements PaymentProvider {
  private get baseUrl() {
    return process.env.SASPAY_API_BASE_URL;
  }
  private get merchantId() {
    return process.env.SASPAY_MERCHANT_ID;
  }
  private get apiKey() {
    return process.env.SASPAY_API_KEY;
  }
  private get webhookSecret() {
    return process.env.SASPAY_WEBHOOK_SECRET;
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.merchantId && this.apiKey && this.webhookSecret);
  }

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    if (!this.isConfigured()) {
      throw new Error("SASPAY_NOT_CONFIGURED");
    }

    // TODO: confirmer le chemin exact de l'endpoint d'initialisation Saspay.
    const response = await fetch(`${this.baseUrl}/v1/transactions/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        reference: params.reference,
        amount: params.amountFcfa,
        currency: "XAF",
        description: params.description,
        customer: {
          email: params.customerEmail,
          phone: params.customerPhone,
        },
        return_url: params.returnUrl,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/webhook`,
      }),
    });

    if (!response.ok) {
      throw new Error(`SASPAY_INIT_FAILED (${response.status})`);
    }

    // TODO: adapter aux noms de champs réels de la réponse Saspay.
    const data = (await response.json()) as { checkout_url: string; transaction_id: string };

    return {
      checkoutUrl: data.checkout_url,
      providerTransactionId: data.transaction_id,
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerificationResult> {
    if (!this.webhookSecret) {
      throw new Error("SASPAY_NOT_CONFIGURED");
    }

    // TODO: confirmer le nom de l'en-tête de signature utilisé par Saspay.
    const signatureHeader = headers.get("x-saspay-signature") ?? "";
    const expectedSignature = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");

    const isValid =
      signatureHeader.length === expectedSignature.length &&
      timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature));

    // TODO: adapter aux noms de champs réels du payload webhook Saspay.
    const payload = JSON.parse(rawBody) as {
      reference: string;
      transaction_id: string;
      status: string;
    };

    const statusMap: Record<string, PaymentWebhookStatus> = {
      success: "success",
      completed: "success",
      paid: "success",
      failed: "failed",
      canceled: "canceled",
      cancelled: "canceled",
      pending: "pending",
    };

    return {
      isValid,
      reference: payload.reference,
      providerTransactionId: payload.transaction_id,
      status: statusMap[payload.status?.toLowerCase()] ?? "pending",
      rawPayload: payload,
    };
  }
}

export const saspayProvider: PaymentProvider = new SaspayProvider();
