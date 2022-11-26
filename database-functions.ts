import { user_id, table_id, tablename, field, errorMessage, isErrorMessage } from './types/basic';
import { User, IUser } from './types/user';

import db from './database-config';

export class DatabaseUsers {
  /**
   * Creates a new user by instantiating it with the User class, 
   * and then adding it to the database
   * @param username The user's name
   * @param password The user's password
   * @param email The user's email
   */
  static async createUser(username: string, password: string, email: string): Promise<User | errorMessage> {
    try {
      // add user to the users table
      await db.query('INSERT INTO users (username, password, email) VALUES ($1, $2, $3)', [username, password, email]);
      
      // get the user's id
      const res = await db.query('SELECT id FROM users WHERE (username = $1 AND password = $2 AND email = $3) ORDER BY id DESC LIMIT 1', [username, password, email]);
      const user_id = res.rows[0].id;

      // add the user to the user_tables table (count and tables automatically take care of themselves)
      await db.query('INSERT INTO user_tables (user_id) VALUES ($1)', [user_id]);

      // add the user to the user_environments table (count and environments automatically take care of themselves)
      await db.query('INSERT INTO user_environments (user_id) VALUES ($1)', [user_id]);
      
      return new User({ id: user_id, username, password, email });
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  /**
   * Get the user from the database by id
   * @param id The user's id
   * @returns The user if found, otherwise undefined
   */
   static async getUser(id: user_id): Promise<User | errorMessage | undefined> {
      try {
        const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        
        if (res.rows[0]) {
          return new User(res.rows[0]);
        }
      } catch (err) {
        return "ERROR: " + (err as Error).message;
      }
  }

  /**
   * Check if a user with the given `user_id` exists in the database
   * @param id The id of the user to check
   * @returns True if the user exists, otherwise false
   */
  static async userExists(id: user_id): Promise<boolean> {
    const user = await this.getUser(id);
    return (!isErrorMessage(user) && user !== undefined);
  }

  /**
   * Delete a user from the database
   * @param id The user's id
   */
  static async deleteUser(id: user_id): Promise<boolean> {
    // TODO: delete all of the user's tables // FIXME: IMPORTANT!
    try {
      await db.query('DELETE FROM users WHERE id = $1', [id]);
      await db.query('DELETE FROM user_tables WHERE user_id = $1', [id]);
      await db.query('DELETE FROM user_environments WHERE user_id = $1', [id]);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Updates a user in the database
   * @param user The new user information
   */
  static async updateUser(user: IUser): Promise<User | errorMessage> {
    try {
      await db.query('UPDATE users SET username = $1, password = $2, email = $3 WHERE id = $4', [user.username, user.password, user.email, user.id]);
      return new User(user);
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }
}

export class DatabaseUserTables {
  /**
   * Creates a new table, assigns ownership to the given `user_id`, and links the table to the user with the given `user_id`
   * @param id The user's id
   * @param name The table's name
   * @param fields The table's fields
   */
  static createTable(id: user_id, name: tablename, fields: Array<field>): void {
    // ...
  }

  /**
   * Deletes a table from the database and removes it from the owners's linked tables
   * @param id The id of the table to delete
   * @returns The success value
   */
  static deleteTable(id: table_id): boolean {
    // ...
    return true;
  }

  /**
   * Get the id of all linked tables for the user with the given `user_id`
   * @param userid The id of the user to get linked tables for
   */
  static getUserTables(userid: user_id): Array<table_id> | undefined {
    // ...
    return;
  }

  /**
   * Get the amount of linked tables the user with the given `user_id` has
   * @param userid The id of the user to get the amount of linked tables for
   */
  static getUserTablesCount(userid: user_id): number | undefined {
    // ...
    return;
  } 
}

/*
export function queryTable(tableid: table_id, query: string): void {
  // ...
}
*/

/*
/**
   * Get a table from the database
   * @param id The id of the table to get
   *
 function getTable(id: table_id): Table | undefined {
  // ...
  return;
}
*/