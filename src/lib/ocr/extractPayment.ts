import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export type ExtractedPaymentDetails = {
  amount: number | null;
  transactionDate: string | null;
  transactionTime: string | null;
  referenceNumber: string | null;
  payerName: string | null;
  payeeName: string | null;
  paymentApp: string | null;
  paymentMethod: string | null;
  notes: string | null;
  confidence: number;
};

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_payment_details",
  description: "Records the payment details visible in a rent-payment screenshot (UPI app, bank transfer confirmation, etc).",
  input_schema: {
    type: "object",
    properties: {
      amount: { type: ["number", "null"], description: "Plain number, no currency symbol." },
      transaction_date: { type: ["string", "null"], description: "YYYY-MM-DD." },
      transaction_time: { type: ["string", "null"], description: "24-hour HH:MM." },
      reference_number: { type: ["string", "null"] },
      payer_name: { type: ["string", "null"] },
      payee_name: { type: ["string", "null"] },
      payment_app: { type: ["string", "null"], description: "e.g. Google Pay, PhonePe, bank app name." },
      payment_method: { type: ["string", "null"], description: "e.g. UPI, NEFT, cash deposit." },
      notes: { type: ["string", "null"], description: "Any uncertainty about the extraction, or other useful transaction notes." },
      confidence: { type: "number", description: "0 to 1 confidence this is a genuine, clearly-read payment screenshot." },
    },
    required: [
      "amount", "transaction_date", "transaction_time", "reference_number", "payer_name",
      "payee_name", "payment_app", "payment_method", "notes", "confidence",
    ],
    additionalProperties: false,
  },
  strict: true,
};

export async function extractPaymentDetails(
  imageBytes: Buffer,
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"
): Promise<{ structured: ExtractedPaymentDetails; raw: unknown }> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: { effort: "low" },
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_payment_details" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBytes.toString("base64") } },
          { type: "text", text: "Extract the payment details from this screenshot." },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) {
    return {
      structured: {
        amount: null, transactionDate: null, transactionTime: null, referenceNumber: null,
        payerName: null, payeeName: null, paymentApp: null, paymentMethod: null,
        notes: "Could not read this screenshot.", confidence: 0,
      },
      raw: response,
    };
  }

  const input = toolUse.input as {
    amount: number | null;
    transaction_date: string | null;
    transaction_time: string | null;
    reference_number: string | null;
    payer_name: string | null;
    payee_name: string | null;
    payment_app: string | null;
    payment_method: string | null;
    notes: string | null;
    confidence: number;
  };

  return {
    structured: {
      amount: input.amount,
      transactionDate: input.transaction_date,
      transactionTime: input.transaction_time,
      referenceNumber: input.reference_number,
      payerName: input.payer_name,
      payeeName: input.payee_name,
      paymentApp: input.payment_app,
      paymentMethod: input.payment_method,
      notes: input.notes,
      confidence: input.confidence,
    },
    raw: response,
  };
}
