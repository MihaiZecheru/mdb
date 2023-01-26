import db from "../database-config/main-database-config";

/**
 * The user's id in the database, which is an integer ranging from 0 to 2147483647.
 */
export type user_id = number;

/**
 * The user's authentication token, which takes the form of a 36 character string
 */
export type user_auth = string;

/**
 * The local name of an environment, which is a string of 1 to 25 characters and is unique within the user's account.
 */
export type env_name = string;

/**
 * The local table name, which is unique within the user's account, and is a string of 1 to 31 characters.
 */
export type tablename = string;

/**
 * The full table name (which is the table's identifier), which is a string of 1 to 63 characters and the same everywhere, conforming to the following pattern:
 * - _userid_environmentName_tablename
 */
export type table_id = string;

/**
 * The local field name, which is a string of up to 50 characters and is unique within the table.
 */
export type fieldname = string;

/**
 * The table description, which is a string of up to 500 characters.
 */
export type tabledescription = string;

/**
 * The field type, which is one of the following:
 * 
 * - string: a string of up to 255 characters (default string size)
 * - string_max: a string of up to 10485760 characters (10MB)
 * - string_nolim: a string of unlimited size (sql TEXT)
 * - string_${string}: a string of up to (string) characters, where string is a number between 1 and 10485760; for example, string_1000
 * - integer: an integer between -2147483648 to +2147483647
 * - float: a floating point number between -2147483648 to +2147483647 (referenced as 'real' in the database)
 * - boolean: a boolean value (true or false)
 * - date: a date in the format of YYYY-MM-DD
 * - datetime: a datetime in the format of YYYY-MM-DD HH:MM:SS
 * - url: a URL of up to 501 characters
 * - email: an email address of up to 320 characters
 * - phone: a phone number of up to 20 characters
 * - array: an array
 * - json: a JSON object
 * - emoji: an emoji code, for example, :smile:, which is a string of up to 58 characters
 */
export type fieldtype = "string" | "string_max" | "string_nolim" | `string_${number}` | "integer" | "float" | "boolean" | "date" | "datetime" | "url" | "email" | "phone" | "array" | "json" | "emoji";

/**
 * A table field, which is an object with both a name and a type
 */
export type field = {
  name: fieldname;
  type: fieldtype;
  setNotNull?: boolean;
  default?: string | number | boolean | null;
  auto_date?: boolean
};

/**
 * An error message with the following format:
 * - ERROR: the_error_message
 */
export type errorMessage = string;

/**
 * Confirm whether or not the given 'value' is of the 'errorMessage' type
 * 
 * @param value The value to validate
 * @returns A boolean value which indicates whether the given 'value' is of the 'errorMessage' type
 */
export function isErrorMessage(value: any): boolean {
  return typeof value === "string" && value.startsWith("ERROR: ");
}

/**
 * Determine whether the given string follows the varchar fieldtype format
 * 
 * @param s The string to validate
 * @returns A boolean value which indicates whether the given 's' is a valid string; varchar(x)
 */
export function typeIsVarchar(s: string): boolean {
  return (/^string_\d+$/).test(s);
}

/**
 * Creates a table_id from the user_id, environment name, and table name
 * @param user_id The id of the user who owns the table
 * @param env_name The name of the environment the table is in
 * @param tablename The name of the table
 * @returns The full table name (which is the table's identifier), which is the same everywhere and follows the following pattern:
 * - _userid_environmentName_tablename
 */
export function tableId(user_id: user_id, env_name: string, tablename: tablename): table_id {
  return `_${user_id}_${env_name}_${tablename}`;
}

export async function getFieldTypes(table_id: table_id): Promise<{ [name: string]: fieldtype }> {
  const fields = JSON.parse((await db.query(`SELECT fields FROM user_tables WHERE table_id = $1`, [table_id])).rows[0].fields);

  const fieldTypes: { [name: string]: fieldtype } = {};
  for (const field of fields) {
    fieldTypes[field.name] = field.type;
  }

  return fieldTypes;
}