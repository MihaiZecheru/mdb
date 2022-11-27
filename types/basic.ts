export type user_id = number;

export type table_id = string;
export type tablename = string;

type fieldname = string;
type fieldtype = "string" | "integer" | "float" | "boolean" | "date" | "url" | "array" | "json";
export type field = { name: fieldname; type: fieldtype };

export type errorMessage = string;

/**
 * Confirm whether or not the given 'value' is of the 'errorMessage' type
 * @param value The value to validate
 * @returns A boolean value which indicates whether the given 'value' is of the 'errorMessage' type
 */
export function isErrorMessage(value: any): boolean {
  return typeof value === "string" && value.startsWith("ERROR: ");
}