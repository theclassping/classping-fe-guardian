import type { PendingGatewayPayment } from "@/features/payments/gateway";

/** A bill as the payment pages show it. */
export type Invoice = {
  /** Backend invoice id, used in URLs. */
  slug: string;
  month: string;
  feeType: string;
  /** Remaining amount, formatted. */
  amount: string;
  billAmount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  statusTone: "warning" | "success" | "late" | "partial";
  method: string;
  paidAt: string;
  fine: string;
  paymentSubmitted?: boolean;
  paymentId?: number;
  paymentMethod?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  proofUrl?: string;
  invoiceNo?: string;
  /** ISO invoice date, used to pick the latest bill. */
  invoiceDate?: string;
  /** Backend student id, used to scope online payments. */
  studentId?: number;
  /** From `GET gateway/invoices`: open, not locked, no manual payment in progress. */
  payableViaGateway?: boolean;
  /** From `GET gateway/invoices`: the online checkout that currently locks this invoice. */
  pendingGatewayPayment?: PendingGatewayPayment;
};

// Backend shapes (Django serializers), as far as the portal reads them.
export type ApiPaymentProof = {
  id?: number;
  uploaded_at?: string;
  image_url?: string;
  url?: string;
  image_data?: { image_url?: string; url?: string };
};

export type ApiPayment = {
  id?: number;
  amount?: string;
  payment_method?: string;
  submitted_at?: string;
  paid_at?: string;
  verified_at?: string;
  payment_date?: string;
  created_at?: string;
  status?: string;
  payment_status?: string;
  rejection_reason?: string | null;
  proofs?: ApiPaymentProof[];
};

export type ApiInvoice = {
  id?: number;
  invoice_no?: string;
  student_id?: number;
  student_name?: string;
  class_name?: string;
  invoice_date?: string;
  created_at?: string;
  updated_at?: string;
  fee_type_name?: string;
  fee_type?: { name?: string } | null;
  due_date?: string;
  status?: string;
  subtotal?: string;
  total_amount?: string;
  amount_paid?: string;
  currency?: string;
  payment_method?: string;
  paid_at?: string;
  payment_date?: string;
  payment?: ApiPayment | null;
  payments?: ApiPayment[];
};

/** A row of `GET /api/gateway/invoices/?student_id=` (backend PayableInvoiceSerializer). */
export type ApiPayableInvoice = {
  id?: number;
  payable?: boolean;
  not_payable_reason?: string | null;
  locked_until?: string | null;
  active_gateway_payment_id?: number | null;
};
