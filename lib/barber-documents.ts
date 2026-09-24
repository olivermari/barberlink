// Verification documents (0020). Must match barber_documents_kind_check.
export const DOCUMENT_KINDS = [
  { kind: "gov_id", label: "Gov ID", required: true },
  { kind: "selfie", label: "Selfie", required: true },
  { kind: "certificate", label: "Cert / permit", required: true },
  { kind: "kit_photo", label: "Kit photo", required: false },
] as const;

export const REQUIRED_DOCUMENT_KINDS: ReadonlySet<string> = new Set(
  DOCUMENT_KINDS.filter((d) => d.required).map((d) => d.kind),
);

export const REQUIRED_DOCUMENT_COUNT = REQUIRED_DOCUMENT_KINDS.size;

// Private bucket — read through signed URLs only.
export const DOCUMENTS_BUCKET = "barber-documents";
