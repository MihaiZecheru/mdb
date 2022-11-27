import { user_id, table_id, tablename, field, errorMessage, isErrorMessage } from './types/basic';
import { User, IUser } from './types/user';
import { Environment, IEnvironment } from './types/environment';
import environmentRef from './environment-ref';

import db from './database-config/main-database-config';
import api_db from './database-config/api-database-config';

/**
 * Static functions for interacting with the users table in the main database.
 * 
 * The users table is part of the "backend" to keep track of the MDB users.
 */
export class DatabaseUsers {
  /**
   * Creates a new user by instantiating it with the User class, 
   * and then adding it to the main database
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

      // add the user to the user_environment_tracker table (count and environments automatically take care of themselves)
      await db.query('INSERT INTO user_environment_tracker (user_id) VALUES ($1)', [user_id]);
      
      return new User({ id: user_id, username, password, email });
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  /**
   * Get the user from the main database by id
   * @param id The user's id
   * @returns The user if found, otherwise undefined, or an errorMessage
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
   * Check if a user with the given `user_id` exists in the main database
   * @param id The id of the user to check
   * @returns True if the user exists, otherwise false
   */
  static async userExists(id: user_id): Promise<boolean | errorMessage> {
    try {
      const res = await db.query(`SELECT 1 FROM users WHERE id = $1`, [id]);
      return !!res.rows.length;
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  /**
   * Delete a user from the main database
   * @param user The user to delete
   */
  static async deleteUser(user: IUser): Promise<boolean>;

  /**
   * Delete a user from the main database
   * @param id The user's id
   */
  static async deleteUser(id: user_id): Promise<boolean>;
  static async deleteUser(user: any): Promise<boolean> {
    // TODO: delete all of the user's tables // FIXME: IMPORTANT!
    const id = (user instanceof User) ? user.id : user;

    try {
      await db.query('DELETE FROM users WHERE id = $1', [id]);
      const user_tables = await DatabaseUserTables.getUserTables(id); // TODO: delete all of the user's user_tables
      await db.query('DELETE FROM user_tables WHERE user_id = $1', [id]);
      await db.query('DELETE FROM user_environment_tracker WHERE user_id = $1', [id]);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Updates a user in the main database
   * @param user The new user information
   * @returns The updated user or an error message
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

/**
 * Static functions for interacting with the user_environment_tracker table in the main database.
 * 
 * The user_environment_tracker table is part of the "backend" to keep track of an MDB user's environments.
 */
export class DatabaseUserEnvironments {
  /**
   * Get the environments for a user from the main database
   * @param user_id The user's id
   * @returns An array of the user's environments or an errorMessage
   */
  static async getAllEnvironments(user_id: user_id): Promise<Array<string> | errorMessage> {
    try {
      const environments = (await db.query('SELECT environments FROM user_environment_tracker WHERE user_id = $1', [user_id])).rows[0].environments;

      if (!environments) {
        return [];       
      } else {
        return JSON.parse(environments);
      }
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  static async getEnvironmentByName(user_id: user_id, environment_name: string): Promise<Environment | errorMessage | undefined> {

    try {
      const res = await db.query('SELECT * FROM user_environments WHERE owner_id = $1 AND name = $2', [user_id, environment_name]);

      if (res.rows[0]) {
        return new Environment(res.rows[0]);
      } else {
        return undefined;
      }
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  static async getEnvironmentCount(user_id: user_id): Promise<number | errorMessage> {
    try {
      const res = await db.query('SELECT count FROM user_environment_tracker WHERE user_id = $1', [user_id]);
      return res.rows[0].count;
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  static async environmentExists(user_id: user_id, name: string): Promise<boolean | errorMessage> {
    try {
      const res = await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, name]);
      return !!res.rows.length;
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  static async createEnvironment(user: IUser, name: string, description: string): Promise<Environment | errorMessage>;
  static async createEnvironment(user: user_id, name: string, description: string): Promise<Environment | errorMessage>;
  static async createEnvironment(user: any, name: string, description: string): Promise<Environment | errorMessage> {
    const user_id = (user instanceof User) ? user.id : user;

    try {
      const envs = await this.getAllEnvironments(user_id);
      
      if (isErrorMessage(envs)) {
        return <errorMessage>envs;
      }

      if (envs.includes(name)) {
        return `ERROR: environment '${name}' already exists`;
      }

      // create the environment object
      const new_env = Environment.newEnvironment(user_id, name, description);

      // add the new environment to the array of environments
      (envs as Array<string>).push(new_env.name);

      // update the list of environments in the main database (user_environment_tracker table)
      await db.query('UPDATE user_environment_tracker SET environments = $1, count = (count + 1) WHERE user_id = $2', [JSON.stringify(envs), user_id]);

      // add the new environment to the main database
      await db.query(`INSERT INTO user_environments (owner_id, name, description, tables) VALUES ($1, $2, $3, $4)`, [user_id, new_env.name, new_env.description, JSON.stringify(new_env.tables)]);
      return new_env;
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  /**
   * Delete an environment from the main database
   * @param user_id The id of the user whom the environment belongs to
   * @param name The name of the environment
   * @returns The success value
   */
  static async deleteEnvironment(user_id: user_id, name: string): Promise<boolean>;
  
  /**
   * Delete an environment from the main database
   * @param user_id The id of the user whom the environment belongs to
   * @param name The name of the environment
   * @returns The success value
   */
  static async deleteEnvironment(user: IUser, name: string): Promise<boolean>;
  static async deleteEnvironment(user: any, name: string): Promise<boolean> {
    const user_id = (user instanceof User) ? user.id : user;

    try {
      // get current environments
      let envs: Array<string> = await this.getAllEnvironments(user_id) as Array<string>;

      if (isErrorMessage(envs)) {
        return false;
      }

      // remove the environment from the array
      envs = envs.filter((env) => env !== name);

      // update the list of environments in the main database
      await db.query('UPDATE user_environment_tracker SET environments = $1, count = (count - 1) WHERE user_id = $2', [JSON.stringify(envs), user_id]);

      // delete the user's environment from the main database
      await db.query(`DELETE FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, name]);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Updates an environment in the database
   * @param env The new environment information
   * @returns The new environment or an error message
   */
  static async updateEnvironment(env: IEnvironment, name_change: boolean, old_name: string | false = false): Promise<Environment | errorMessage> {
    try {
      await db.query('UPDATE user_environments SET name = $1, description = $2 WHERE owner_id = $3 AND name = $4', [env.name, env.description, env.owner_id, old_name ? old_name : env.name]);

      if (name_change) {
        // update the user_environment_tracker table as well
        let envs = await this.getAllEnvironments(env.owner_id);
        
        if (isErrorMessage(envs)) {
          return <errorMessage>envs;
        }

        (envs as Array<string>).splice(envs.indexOf(env.name), 1, env.name);
        await db.query('UPDATE user_environment_tracker SET environments = $1 WHERE user_id = $2', [JSON.stringify(envs), env.owner_id]);
      }

      return new Environment(env);
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }
  
  /**
   * Get all tables under an environment
   * @param user_id The id of the user whom the environment belongs to
   * @param environment_name The name of the environment
   */
  static async getTables(user: user_id, environment_name: string): Promise<Array<string> | errorMessage>;

  /**
   * Get all tables under an environment
   * @param user_id The id of the user whom the environment belongs to
   * @param environment_name The name of the environment
   */
  static async getTables(user: IUser, environment_name: string): Promise<Array<string> | errorMessage>;
  static async getTables(user: any, environment_name: string): Promise<Array<string> | errorMessage> {
    const user_id = (user instanceof User) ? user.id : user;
    try {
      const tables = (await db.query('SELECT tables FROM user_environments WHERE owner_id = $1 AND name = $2', [user_id, environment_name])).rows[0].tables;
      return JSON.parse(tables);
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }
}

/**
 * Static functions for interacting with the user_tables table in the database.
 * 
 * The user_tables table is part of the "backend" to keep track of an MDB user's tables.
 */
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