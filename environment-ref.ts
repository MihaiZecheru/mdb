import { IUser, User } from "./types/user";
import { user_id } from "./types/basic";

/**
 * Get the 'official name' for the environment, which can be used to reference it in the database
 * 
 * @param user The id of the user to whom the environment belongs to
 * @param environment_name The name of the environment
 */
function environmentRef(user: user_id, environment_name: string): string;

/**
* Get the 'official name' for the environment, which can be used to reference it in the database
* 
* @param user The user to whom the environment belongs to
* @param environment_name The name of the environment
*/
function environmentRef(user: IUser, environment_name: string): string;
function environmentRef(user: any, environment_name: string): string {
  const user_id = (user instanceof User) ? user.id : user;
  return `_${user_id}_${environment_name}`
}

export default environmentRef;