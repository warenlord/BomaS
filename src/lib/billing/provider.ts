export interface InitPaymentParams {
  /** Référence interne unique (payments.reference) que le webhook devra nous renvoyer. */
  reference: string;
  amountFcfa: number;
  description: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
}

export interface InitPaymentResult {
  checkoutUrl: string;
  providerTransactionId: string;
}

export type PaymentWebhookStatus = "success" | "failed" | "canceled" | "pending";

export interface WebhookVerificationResult {
  isValid: boolean;
  reference: string;
  providerTransactionId: string;
  status: PaymentWebhookStatus;
  rawPayload: unknown;
}

/**
 * Interface découplée du fournisseur de paiement concret, pour pouvoir
 * swapper l'implémentation (SingPay aujourd'hui, éventuellement un autre
 * agrégateur demain) sans toucher aux routes API ni à la logique métier.
 */
export interface PaymentProvider {
  /** true si les identifiants marchands sont configurés (sinon on reste en mode "stub"). */
  isConfigured(): boolean;
  initPayment(params: InitPaymentParams): Promise<InitPaymentResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerificationResult>;
}
