import { errorMessage, isErrorMessage, user_id } from "./types/basic";

export class Handle {
  /**
   * 
   * @param id The given id to validate
   * @param res The express.js 'result' object
   * @returns A boolean value which indicates whether an error was sent via the 'res' object (meaning the id was invalid)
   */
  static invalidateUserId(id: user_id, res: any): boolean {
    if (isNaN(id)) {
      res.status(400).json({ error: `User ID '${id}' is invalid; User ID must be an integer` });
      return true;
    }
    return false;
  }

  
}