import { errorMessage, isErrorMessage, user_id } from "./types/basic";

export class Handle {
  /**
   * 
   * @param id The given id to validate
   * @param res The express.js 'result' object
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
   * 
   * @param userExists The result from the call to the 'DatabaseUsers.userExists' function
   * @param res The express.js 'result' object
   * @returns A boolean value which indicates whether an error was sent via the 'res' object (meaning the user does not exist)
   */
   static userExists(userExists: boolean | errorMessage, res: any, user_id: user_id): boolean {
    if (isErrorMessage(userExists)) {
      res.status(400).json({ error: userExists });
      return true;
    } else if (!userExists) {
      res.status(400).json({ error: `User with id '${user_id}' does not exist` });
      return true;
    }
    return false;
  }
}