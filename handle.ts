import { errorMessage, isErrorMessage, user_id } from "./types/basic";
import { Environment } from "./types/environment";
import { User } from "./types/user";

export class Handle {
  /**
   * Handle the result of an invalid user id, which is a value that is not an integer
   * 
   * @param id The given id to validate
   * @param res The express.js 'response' object
   * @returns A boolean value which indicates whether an error was sent via the 'res' object (meaning the id was invalid)
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
   * 
   * @param userExists The result from the call to the 'DatabaseUsers.userExists' (or similar) function
   * @param res The express.js 'response' object
   * @returns A boolean value which indicates whether an error was sent via the 'res' object (meaning the user does not exist)
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
  static missingFieldsError(fields: { [key: string]: any }, from: "body" | "query" | "params", res): void{
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
}