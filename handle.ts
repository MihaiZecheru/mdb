import { errorMessage, fieldtype, isErrorMessage, user_id, field, typeIsVarchar, tableId, tablename, user_auth } from "./types/basic";
import { DatabaseUserEnvironments, DatabaseUsers, DatabaseUserTables } from "./database-functions";
import { Environment } from "./types/environment";
import { Table } from "./types/table";
import { User } from "./types/user";
import db from "./database-config/main-database-config";
require('dotenv').config();

export const MAX_VARCHAR: number = 10485760;
const ADMIN_API_KEY = process.env['ADMIN_API_KEY'];

export function isAlpha(str: string): boolean {
  return (/^[a-zA-Z_]+$/i).test(str);
}

export function isAlphanumeric(str: string): boolean {
  return (/^[A-Za-z0-9_]+$/i).test(str);
}

export function isValidUrl(str: string) {
  const pattern = new RegExp(
    '^([a-zA-Z]+:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR IP (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$', // fragment locator
    'i'
  );
  return pattern.test(str);
}

export function isValidEmail(str: string) {
  return new RegExp(/^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/)
    .test(str);
}

export function isValidPhone(str: string) {
  return new RegExp(/^\d{3}[-\.]\d{3}[-\.]\d{4}$/im).test(str);
}

export function isValidEmoji(str: string) {
  return new RegExp(/^:\w+:$/g).test(str);
}

export default class Handle {
  /**
   * Handle the result of an invalid user id, which is a value that is not an integer
   * 
   * @param id The given id to validate
   * @param res The express.js 'response' object
   * @returns A boolean value which indicates whether an error message was sent via the 'res' object. If this value is true, the API call should be terminated as it has been resolved
   */
   static invalidUserId(id: user_id, res: any): boolean {
    if (isNaN(id)) {
      res.status(400).json({ error: `User ID '${id}' is invalid; User ID must be an integer` });
      return true;
    }
    return false;
  }

  /**
   * Handle an invalid user, essentially, handle the result of a call to DatabaseUsers.userExists
   * If the user exists, it will be returned, otherwise an error message will be sent via the 'res' object
   * 
   * @param userExists The result from the call to the 'DatabaseUsers.userExists' (or similar) function
   * @param res The express.js 'response' object
   * @returns A boolean value which indicates whether an error message was sent via the 'res' object. If this value is true, the API call should be terminated as it has been resolved
   */
   static userExists(userExists: any, res: any, user_id: user_id): boolean {
    if (isErrorMessage(userExists)) {
      res.status(400).json({ error: <errorMessage>userExists });
      return true;
    } else if (!userExists) {
      res.status(400).json({ error: `User with id '${user_id}' does not exist` });
      return true;
    }
    return false;
  }

  /**
   * Handle an invalid enivoronment, essentially, handle the result of a call to DatabaseUserEnvironments.getEnvironmentByName
   * If the environment exists, false will be returned and nothing will happen, otherwise an error message will be sent via the 'res' object
   * 
   * @param envExists The result from the call to the 'DatabaseUserEnvironments.environmentExists' (or similar) function
   * @param res The express.js 'response' object
   * @param env_name The name of the environment that was checked
   * @returns A boolean value which indicates whether an error message was sent via the 'res' object. If this value is true, the API call should be terminated as it has been resolved
   */
  static envExists(envExists: any, res: any, env_name: string) {
    if (isErrorMessage(envExists)) {
      res.status(400).json({ error: <errorMessage>envExists });
      return true;
    } else if (!envExists) {
      res.status(400).json({ error: `Environment '${env_name}' does not exist` });
      return true;
    }
    return false;
  }

  /**
     * Handle an invalid table, essentially, handle the result of a call to DatabaseUserTables.getTable
     * If the table exists, false will be returned and nothing will happen, otherwise an error message will be sent via the 'res' object
     * 
     * @param tableExists The result from the call to the 'DatabaseUserEnvironments.tableExists' (or similar) function
     * @param res The express.js 'response' object
     * @param table_name The name of the table that was checked
     * @returns A boolean value which indicates whether an error message was sent via the 'res' object. If this value is true, the API call should be terminated as it has been resolved
     */
  static tableExists(tableExists: any, res: any, table_name: string) {
    if (isErrorMessage(tableExists)) {
      res.status(400).json({ error: <errorMessage>tableExists });
      return true;
    } else if (!tableExists) {
      res.status(400).json({ error: `Table '${table_name}' does not exist` });
      return true;
    }
    return false;
  }

  /**
   * Handle the result of a function that returns either an object or an error message
   * Note that function will end the call to the endpoint as it resolves either way
   * 
   * @param expressResponseObj The express.js 'response' object
   * @param funcResult The result from the call to the 'DatabaseUsers.updateUser' (or similar) function
   */
  static functionResult(expressResponseObj: any, funcResult: User | Environment | Table | errorMessage): void {
    if (isErrorMessage(funcResult)) {
      expressResponseObj.status(400).json({ error: funcResult });
    } else {
      expressResponseObj.status(200).json((<User | Environment | Table>funcResult).toJSON());
    }
  }

  /**
   * Takes in a series of key-value pairs (fields) and resolves the API call with an error message if any of the fields are missing
   * The error message is formatted, specifying exactly which fields are missing
   * 
   * @param fields The fields to check
   * @param from Where are the fields missing from?
   * @param res The express.js 'response' object
   */
  static missingFieldsError(fields: { [key: string]: any }, from: "body" | "query" | "params" | "table fields", res: any): void{
    const missingFields = Object.keys(fields).filter(key => fields[key] === undefined);
    
    if (missingFields.length > 2) {
      const lastMissingField = missingFields.pop();
      res.status(400).json({ error: `Missing fields "${missingFields.join('", "')}", and "${lastMissingField}" from ${from}` });
    } else if (missingFields.length === 2) {
      res.status(400).json({ error: `Missing fields "${missingFields[0]}" and "${missingFields[1]}" from ${from}` });
    } else if (missingFields.length === 1) {
      res.status(400).json({ error: `Missing field "${missingFields[0]}" from ${from}` });
    }
  }

  /**
   * Handle an API call to /:env_name/<property_name>
   * 
   * @param req The express.js 'request' object
   * @param res The express.js 'response' object
   * @returns The environment object that was requested, otherwise 'void'. If 'void' is returned, the API call has been resolved and should be terminated
   */
  static async APIcall_GetEnvironmentProperty(req: any, res: any): Promise<Environment | void> {
    const env_name = req.params.env_name;
    const user_id = req.query.user_id;

    if (!isNaN(env_name)) {
      return res.status(400).json({ error: `Environment name '${env_name}' is invalid (note: this endpoint takes the user_id as a query param, not as a part of the path)` });
    }

    if (!user_id) {
      return Handle.missingFieldsError({ user_id }, "query", res);
    }

    if (Handle.invalidUserId(user_id, res)) return;

    const userExists = await DatabaseUsers.userExists(user_id);
    if (Handle.userExists(userExists, res, user_id)) return;

    const environment = await DatabaseUserEnvironments.getEnvironmentByName(user_id, env_name);
    if (Handle.envExists(environment, res, env_name)) return;

    return <Environment>environment;
  }

  /**
   * Handle an API call to /:user_id/<property_name>
   * 
   * @param req The express.js 'request' object
   * @param res The express.js 'response' object
   * @returns The user object that was requested, otherwise 'void'. If 'void' is returned, the API call has been resolved and should be terminated
   */
  static async APIcall_GetUsersProperty(req: any, res: any): Promise<User | void> {
    const user_id = req.params.user_id;
    if (Handle.invalidUserId(user_id, res)) return;

    const user = await DatabaseUsers.getUser(user_id);
    if (Handle.userExists(user, res, user_id)) return;

    return <User>user;
  }

  static async APIcall_GetTablesProperty(req: any, res: any): Promise<Table | void> {
    const user_id = req.params.user_id;
    const env_name = req.params.env_name;
    const table_name = req.params.table_name;

    if (Handle.invalidUserId(user_id, res)) return;

    const userExists = await DatabaseUsers.userExists(user_id);
    if (Handle.userExists(userExists, res, user_id)) return;

    const env_exists = await DatabaseUserEnvironments.environmentExists(user_id, env_name);
    if (Handle.envExists(env_exists, res, env_name)) return;

    const table = await DatabaseUserTables.getTable(tableId(user_id, env_name, table_name), table_name);
    if (Handle.tableExists(table, res, table_name)) return;

    return <Table>table;
  }

  /**
   * Checks for an invalid default value based on the given type.
   * 
   * Example of invalid default value: 'type' is 'int' but 'd' is 'hello world'
   * @param d The default value to check
   * @param t The type to validate the default value with
   * @param notNull A boolean that indicates whether 'not null' was requested to be set for this field
   * @param res The express.js 'response' object
   */
  static invalidDefaultValue(d: any, t: fieldtype, res: any): boolean {
    /** type error */
    function t_err(_t: string): true {
      res.status(400).json({ error: `Invalid default value '${d}' for type '${_t}'` });
      return true;
    }

    /** length error */
    function l_err(l: number, _t: string) {
      res.status(400).json({ error: `Default value '${d}' exceeds max length of '${l}' characters set by type '${_t}'` });
      return true;
    }

    /** number error */
    function n_err(n: number, _t: string) {
      res.status(400).json({ error: `Default value '${d}' exceeds ${n > 0 ? "max" : "min"} value of '${n}' set by type '${_t}'` });
      return true;
    }

    /** invalid value error */
    function nv_err(d: string, _t: string) {
      res.status(400).json({ error: `Default value '${d}' is not a valid ${_t}` });
      return true;
    }

    switch (t) {
      case "string":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        if (d.length > 255) {
          return l_err(255, t);
        }

        break;

      case "string_max":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        if (d.length > MAX_VARCHAR) {
          return l_err(MAX_VARCHAR, t);
        }

        break;

      case "string_nolim":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        break;

      case "integer":
        if (typeof d !== 'number' || d % 1 !== 0) {
          return t_err(t);
        }

        if (d < -2147483648 || d > 2147483647) {
          return n_err(d < 0 ? -2147483647 : 2147483647, t);
        }

        break;

      case "float":
        if (typeof d !== 'number') {
          return t_err(t);
        }
        
        if (d < -2147483648 || d > 2147483647) {
          return n_err(d < 0 ? -2147483647 : 2147483647, t);
        }

        break;

      case "boolean":
        if (typeof d !== 'boolean' && d !== 0 && d !== 1 && d !== '0' && d !== '1' && d !== 'true' && d !== 'false') {
          return t_err(t);
        }

        break;

      case "date":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        if (isNaN(Date.parse(d))) {
          return nv_err(d, t);
        }

        break;

      case "time":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        if (isNaN(Date.parse(`1970-01-01T${d}Z`))) {
          return nv_err(d, t);
        }

        break;

      case "datetime":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        if (isNaN(Date.parse(d))) {
          return nv_err(d, t);
        }

        break;

      case "url":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        if (d.length > 501) {
          return l_err(500, t);
        }

        if (!isValidUrl(d)) {
          return nv_err(d, t);
        }

        break;

      case "email":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        if (d.length > 320) {
          return l_err(320, t);
        }

        if (!isValidEmail(d)) {
          return nv_err(d, t);
        }

        break;

      case "phone":
        if (typeof d !== 'number' && typeof d !== 'string') {
          return t_err(t);
        }

        if (typeof d === 'string' && d.length > 20) {
          return l_err(20, t);
        }

        if (typeof d === 'number' && d.toString().length > 20) {
          return l_err(20, t);
        }

        if (!isValidPhone(d.toString())) {
          return nv_err(d.toString(), t);
        }

        break;

      case "array":
        if (!Array.isArray(d)) {
          return t_err(t);
        }

        break;

      case "json":
        if (typeof d !== 'object') {
          return t_err(t);
        }

        break;

      case "emoji":
        if (typeof d !== 'string') {
          return t_err(t);
        }

        if (d.length > 58) {
          return l_err(58, t);
        }

        if (!isValidEmoji(d)) {
          return nv_err(d, t);
        }

        break;

      // string_${string} type
      default:
        if (typeof d !== 'string') {
          return t_err(t);
        }

        const maxLen = parseInt(t.split('_')[1]);
        if (d.length > maxLen) {
          return l_err(maxLen, t);
        }

        break;
    }

    return false;
  }

  static formatTableFieldsAndValidation(table_fields: any, res: any): [boolean, any] {
    // array[0] = boolean, array[1] = string
    let field_contains_spaces: Array<any> = [false, ""];

    const formatted_table_fields: Array<field> = Object.keys(table_fields).map((key) => {
      // check if name has spaces
      if (key.includes(' ')) {
        field_contains_spaces[0] = true;
        field_contains_spaces[1] = key;
      }

      if (typeof table_fields[key] === 'string') {
        // no dict with optional values was passed
        return {
          name: key,
          type: table_fields[key]
        }
      } else {
        // dict with optional values was passed
        let field: field = {
          name: key,
          type: table_fields[key].type,
        };
        
        if (typeof table_fields[key].setNotNull !== 'undefined') {
          field.setNotNull = table_fields[key].setNotNull;
        }
        
        if (typeof table_fields[key].default !== 'undefined') {
          field.default = table_fields[key].default;
        }
        
        if (typeof table_fields[key].auto_date !== 'undefined') {
          field.auto_date = table_fields[key].auto_date;
        }
        
        return field;
      }
    });
    
    // validate fields
    for (let field of formatted_table_fields) {
      if (!field.name) {
        return res.status(400).json({ error: `Field name cannot be empty` });
      }
      
      if (!(["string", "string_max", "string_nolim", "integer", "float", "boolean", "date", "time", "datetime", "url", "email", "phone", "array", "json", "emoji"].includes(field.type)) && !typeIsVarchar(field.type)) {
        return res.status(400).json({ error: `Field type '${field.type}' for field '${field.name}' is invalid` });
      }
      
      if (field.default) {
        // example of default value being invalid: type is 'int', but default value is "hello world"
        if (Handle.invalidDefaultValue(field.default, field.type, res)) return [true, null];
      }
      
      if (field.auto_date && !(["date", "time", "datetime"].includes(field.type))) {
        return res.status(400).json({ error: `Field '${field.name}' has 'auto_date' enabled but is not of the 'date', 'time', or 'datetime' type` });
      }
      
      if (field.auto_date && (field.default || typeof field.setNotNull !== 'undefined')) {
        return res.status(400).json({ error: `Field '${field.name}' has 'auto_date' enabled but was given a 'default' and/or a 'setNotNull' value. When enabling 'auto_date', niether a 'default' or a 'setNotNull' value should be passed` });
      }
    };

    if (field_contains_spaces[0]) {
      res.status(400).json({ error: `Field name '${field_contains_spaces[1]}' cannot contain spaces` });
      return [true, null];
    }

    return [false, formatted_table_fields]; // tables are valid; no error
  }

  static invalidNameAndDescLengths(table_name: string, table_description: string, res: any): boolean {
    if (table_name && table_name.length > 31) {
      res.status(400).json({ error: `Table name '${table_name}' is too long (max length is 31 characters). Given: ${table_name.length}` });
      return true;
    }

    if (table_name && !isAlpha(table_name[0])) {
      res.status(400).json({ error: `Table name '${table_name}' must start with a letter or underscore` });
      return true;
    }

    if (table_name && !isAlphanumeric(table_name)) {
      res.status(400).json({ error: `Table name '${table_name}' can only contain letters, numbers, and underscores` });
      return true;
    }
  
    if (table_description && table_description.length > 500) {
      res.status(400).json({ error: `Table description '${table_description}' is too long (max length is 500 characters). Given: ${table_description.length}` });
      return true;
    }

    return false;
  }

  /**
   * Checks if the given user exists and is authorized to make the request (checks for matchin API key)
   * 
   * @param res The express.js 'response' object
   * @returns A boolean value which indicates whether an error message was sent via the 'res' object. If this value is true, the API call should be terminated as it has been resolved
   */ 
  static async authorization(given_auth: user_auth, user_id: user_id, res: any, admin: boolean = false): Promise<boolean> {
    if (!given_auth) {
      res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
      return true;
    }
    
    try {
      const response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);
      
      if (response.rows.length === 0) {
        res.status(400).json({ error: `User with id '${user_id}' does not exist` });
        return true;
      }
      
      const user_auth = (admin) ? ADMIN_API_KEY : response.rows[0].auth;
      
      if (given_auth !== user_auth) {
        res.status(401).json({ error: (admin) ? `User is not authorized (admin only)` : `User is not authorized` });
        return true;
      } else {
        return false;
      }
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return true;
    }
  }

  static adminAuthorized(given_auth: user_auth, res: any): boolean {
    return given_auth === ADMIN_API_KEY;
  }

  static spacesInParams(res: any, ...params: Array<string>): boolean {
    for (let i = 0; i < params.length; i++) {
      if (params[i].includes(' ')) {
        res.status(400).json({ error: `Parameter '${params[i]}' cannot contain spaces` });
        return true;
      }
    }

    return false;
  }
}
