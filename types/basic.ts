export type user_id = number;

export type table_id = string;
export type tablename = string;

type fieldname = string;
type fieldtype = "string" | "integer" | "float" | "boolean" | "date" | "url" | "array" | "json";
export type field = { name: fieldname; type: fieldtype };

export type TmissingFieldsError = { "error": string };
export type errorMessage = string;
// function for checking if a string is an errorMessage
export function isErrorMessage(value: any): boolean {
  return typeof value === "string" && value.startsWith("ERROR: ");
}