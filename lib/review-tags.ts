// Must match the reviews_tags_allowed check in 0016_customer_redesign.sql.
export const REVIEW_TAGS = [
  { value: "on_time", label: "On time" },
  { value: "clean_setup", label: "Clean setup" },
  { value: "great_cut", label: "Great cut" },
  { value: "friendly", label: "Friendly" },
] as const;

export const REVIEW_TAG_LABEL: Record<string, string> = Object.fromEntries(
  REVIEW_TAGS.map((t) => [t.value, t.label]),
);
