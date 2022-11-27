import { DatabaseUserEnvironments, DatabaseUsers } from "./database-functions";
import { errorMessage, isErrorMessage, user_id } from "./types/basic";
import { Environment } from "./types/environment";
import { User } from "./types/user";

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
      res.status(400).json({ error: userExists });
      return true;
    } else if (!userExists) {
      res.status(400).json({ error: `User with id '${user_id}' does not exist` });
      return true;
    }
    return false;
  }

  /**
   * Handle an invalid enivoronment, essentially, handle the result of a call to DatabaseUserEnvironments.getEnvironmentByName
   * If the environment exists, it will be returned, otherwise an error message will be sent via the 'res' object
   * 
   * @param envExists The result from the call to the 'DatabaseUsers.environmentExists' (or similar) function
   * @param res The express.js 'response' object
   * @param env_name The name of the environment that was checked
   * @returns A boolean value which indicates whether an error message was sent via the 'res' object. If this value is true, the API call should be terminated as it has been resolved
   */
  static envExists(envExists: any, res: any, env_name: string) {
    if (isErrorMessage(envExists)) {
      res.status(400).json({ error: envExists });
      return true;
    } else if (!envExists) {
      res.status(400).json({ error: `Environment '${env_name}' does not exist` });
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
  static functionResult(expressResponseObj: any, funcResult: User | Environment | errorMessage): void {
    if (isErrorMessage(funcResult)) {
      expressResponseObj.status(400).json({ error: funcResult });
    } else {
      expressResponseObj.status(200).json((<User | Environment>funcResult).toJSON());
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
    if (await Handle.userExists(user, res, user_id)) return;

    return <User>user;
  }
}