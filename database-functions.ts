import { user_id, table_id, tablename, field, errorMessage, isErrorMessage, tabledescription, tableId, env_name, user_auth } from './types/basic';
import { User, IUser } from './types/user';
import { Environment, IEnvironment } from './types/environment';

import db from './database-config/main-database-config';
import api_db from './database-config/api-database-config';
import { ITable, Table } from './types/table';

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
  static async createUser(username: string, password: string, email: string, auth: user_auth): Promise<User | errorMessage> {
    try {
      // add user to the users table
      await db.query('INSERT INTO users (username, password, email, auth) VALUES ($1, $2, $3, $4)', [username, password, email, auth]);
      
      // get the user's id
      const res = await db.query('SELECT id FROM users WHERE (username = $1 AND password = $2 AND email = $3) ORDER BY id DESC LIMIT 1', [username, password, email]);
      const user_id = res.rows[0].id;

      // add the user to the user_tables_tracker table (count and tables automatically take care of themselves)
      await db.query('INSERT INTO user_tables_tracker (user_id) VALUES ($1)', [user_id]);

      // add the user to the user_environment_tracker table (count and environments automatically take care of themselves)
      await db.query('INSERT INTO user_environment_tracker (user_id) VALUES ($1)', [user_id]);
      
      return new User({ id: user_id, username, password, email, auth });
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
    const id = (user instanceof User) ? user.id : user;

    try {
      const user_table_ids = await DatabaseUserTables.getAllTableIds(id);

      if (isErrorMessage(user_table_ids)) {
        return false;
      }

      const table_ids = (user_table_ids as Array<table_id>).join(", ");      
      await api_db.query(`DROP TABLE IF EXISTS ${table_ids}`);

      // remove user
      await db.query('DELETE FROM users WHERE id = $1', [id]);
      
      // remove user tables
      await db.query('DELETE FROM user_tables WHERE owner_id = $1', [id]);
      
      // remove user tables references (links)
      await db.query('DELETE FROM user_tables_tracker WHERE user_id = $1', [id]);

      // remove user environments
      await db.query('DELETE FROM user_environments WHERE owner_id = $1', [id]);

      // remove user environments references (links)
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

  static async getTables(user_id: user_id, full: boolean = false): Promise<Array<ITable> | Array<table_id> | errorMessage> {
    try {
      if (full) {
        const res = await db.query(`SELECT * FROM user_tables WHERE owner_id = $1`, [user_id]);
        return res.rows.map((row: any) => new Table(row));
      } else {
        const res = await db.query(`SELECT table_id FROM user_tables WHERE owner_id = $1`, [user_id]);
        return res.rows.map((row: any) => row.table_id);
      }
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  static async getTablesCount(user_id: user_id): Promise<number | errorMessage> {
    try {
      const res = await db.query(`SELECT count FROM user_tables_tracker WHERE user_id = $1`, [user_id]);
      return res.rows[0].count;
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
   * Get the environment names for a user from the main database
   * @param user_id The user's id
   * @returns An array of the user's environment names or an errorMessage
   */
  static async getAllEnvironmentNames(user_id: user_id): Promise<Array<string> | errorMessage> {
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

  /**
   * Get the environments for a user from the main database
   * @param user_id The user's id
   * @returns An array of the user's environments or an errorMessage
   */
   static async getAllEnvironments(user_id: user_id): Promise<Array<Environment> | errorMessage> {
    try {
      const environments = (await db.query('SELECT * FROM user_environments WHERE owner_id = $1', [user_id])).rows;

      if (!environments.length) {
        return [];       
      } else {
        environments.forEach((env: any) => env.tables = JSON.parse(env.tables));
        return environments.map((environment: any) => new Environment(environment));
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
      const envs = await this.getAllEnvironmentNames(user_id);
      
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
   * @param user The user whom the environment belongs to
   * @param name The name of the environment
   * @returns The success value
   */
  static async deleteEnvironment(user: IUser, name: string): Promise<boolean>;
  static async deleteEnvironment(user: any, name: string): Promise<boolean> {
    const user_id = (user instanceof User) ? user.id : user;

    try {
      // get all tables in the environment
      const tables = await DatabaseUserEnvironments.getTableNames(user_id, name);
      
      if (isErrorMessage(tables)) {
        return false;
      }
      
      for (let i = 0; i < tables.length; i++) {
        // delete table from the api database and the main database; handles deleting the table
        const success = await DatabaseUserTables.deleteTable(user_id, name, tables[i]);
        if (!success) return false;
      }

      // get current environments
      let envs: Array<string> = await this.getAllEnvironmentNames(user_id) as Array<string>;

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
        let envs = await this.getAllEnvironmentNames(env.owner_id);
        
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
  static async getTableNames(user: user_id, environment_name: string): Promise<Array<string> | errorMessage>;

  /**
   * Get all tables under an environment
   * @param user_id The id of the user whom the environment belongs to
   * @param environment_name The name of the environment
   */
  static async getTableNames(user: IUser, environment_name: string): Promise<Array<string> | errorMessage>;
  static async getTableNames(user: any, environment_name: string): Promise<Array<table_id> | errorMessage> {
    const user_id = (user instanceof User) ? user.id : user;

    try {
      const tables = (await db.query('SELECT tables FROM user_environments WHERE owner_id = $1 AND name = $2', [user_id, environment_name])).rows[0].tables;
      const parsed_tables = JSON.parse(tables);
      return parsed_tables;
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }
}

/**
 * Static functions for interacting with the user_tables_tracker table in the database.
 * 
 * The user_tables_tracker table is part of the "backend" to keep track of an MDB user's tables.
 */
export class DatabaseUserTables {
  /**
   * Creates a new table, assigns ownership to the given `user_id`, and links the table to the user with the given `user_id`
   * @param id The user's id
   * @param name The table's name
   * @param description The table's description
   * @param fields The table's fields
   */
  static async createTable(id: user_id, env_name: string, name: tablename, description: tabledescription, fields: Array<field>): Promise<Table | errorMessage> {
    try {
      // get current user tables
      let tables = await this.getAllTableIds(id);
      
      if (isErrorMessage(tables)) {
        return <errorMessage>tables;
      }
      
      const table_id = tableId(id, env_name, name);

      // check for already existing tablename
      for (let i = 0; i < tables.length; i++) {
        if (tables[i] === table_id) {
          return `ERROR: table '${tables[i]}' already exists`;
        }
      }

      // add the table to the list of tables
      (tables as Array<table_id>).push(table_id);

      // link the table to the user
      await db.query(`UPDATE user_tables_tracker SET tables = $1, count = (count + 1) WHERE user_id = $2`, [JSON.stringify(tables), id]);

      // add the table information to the user_tables database
      await db.query(`INSERT INTO user_tables (owner_id, table_id, environment_name, tablename, description, fields) VALUES ($1, $2, $3, $4, $5, $6)`, [id, table_id, env_name, name, description, JSON.stringify(fields)]);

      // link the table to the environment
      let env_tables = await DatabaseUserEnvironments.getTableNames(id, env_name);

      if (isErrorMessage(env_tables)) {
        return <errorMessage>env_tables;
      }

      (env_tables as Array<table_id>).push(table_id);
      await db.query(`UPDATE user_environments SET tables = $1 WHERE owner_id = $2 AND name = $3`, [JSON.stringify(tables), id, env_name]);

      // create the table in the database
      await api_db.query(`CREATE TABLE ${table_id} (_id SERIAL PRIMARY KEY, ${this.generateCustomFields(fields)})`);

      return Table.newTable(id, tableId(id, env_name, name), env_name, name, description, fields);
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  static generateCustomFields(fields: Array<field>): string {
    let str = "";

    for (let i = 0; i < fields.length; i++) {
      const name = fields[i].name;
      const type = fields[i].type;
      const setNotNull = fields[i].setNotNull;
      let default_value = fields[i].default;

      if (typeof default_value === "string") {
        default_value = `'${default_value}'`;
      } else if (typeof default_value === "boolean") {
        default_value = default_value ? "TRUE" : "FALSE";
      } else if (default_value === null) {
        default_value = "NULL";
      }

      let sql_type;

      switch (type) {
        case "string":
          sql_type = "VARCHAR(255)";
          break;

        case "string_max":
          sql_type = "VARCHAR(10485760)";
          break;

        case "string_nolim":
          sql_type = "TEXT";
          break;

        case "integer":
          sql_type = "INT";
          break;

        case "float":
          sql_type = "REAL";
          break;

        case "boolean":
          sql_type = "BOOLEAN";
          break;

        case "date":
          if (fields[i]?.auto_date) {
            sql_type = "DATE NOT NULL DEFAULT CURRENT_DATE";
          } else {
            sql_type = "DATE";
          }
          break;

        case "time":
          if (fields[i]?.auto_date) {
            sql_type = "TIME NOT NULL DEFAULT CURRENT_TIME(0)"
          }

        case "datetime":
          if (fields[i]?.auto_date) {
            sql_type = "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(0)";
          } else {
            sql_type = "TIMESTAMP"
          }
          break;
        
        case "url":
          sql_type = "VARCHAR(501)";
          break;

        case "email":
          sql_type = "VARCHAR(320)";
          break;

        case "phone":
          sql_type = "VARCHAR(20)";
          break;

        case "array":
        case "json":
          sql_type = "TEXT";
          break;

        case "emoji":
          sql_type = "VARCHAR(58)"; // max emoji size is 58 chars; "U+1F469 U+200D U+2764 U+FE0F U+200D U+1F48B U+200D U+1F468"
          break;

        // string_${string}
        default:
          const string_length = type.split("_")[1];
          sql_type = `VARCHAR(${string_length})`;
          break;
      }

      str += `${name} ${sql_type}${setNotNull ? " NOT NULL" : ""}${default_value ? ` DEFAULT ${default_value}` : ""}, `;
    }

    return str.substring(0, str.length - 2);
  }

  /**
   * Deletes a table from the database and removes it from the owners's linked tables
   * @param id The id of the table to delete
   * @returns The success value
   */
  static async deleteTable(user_id: user_id, env_name: env_name, table_id: table_id): Promise<boolean> {
    try {
      // delete table
      await db.query(`DELETE FROM user_tables WHERE table_id = $1`, [table_id]);
      
      // delete table link
      const tables = await this.getAllTableIds(user_id);

      if (isErrorMessage(tables)) {
        return false;
      }

      const new_tables = (tables as Array<table_id>).filter((table) => table !== table_id);

      // remove table link from user
      await db.query(`UPDATE user_tables_tracker SET tables = $1, count = (count - 1) WHERE user_id = $2`, [JSON.stringify(new_tables), user_id]);

      // remove table link from environment
      let env_tables = await DatabaseUserEnvironments.getTableNames(user_id, env_name);
      
      if (isErrorMessage(env_tables)) {
        return false;
      }
      
      const new_env_tables = (env_tables as Array<table_id>).filter((table) => table !== table_id);
      await db.query(`UPDATE user_environments SET tables = $1 WHERE owner_id = $2 AND name = $3`, [JSON.stringify(new_env_tables), user_id, env_name]);

      // delete table
      await api_db.query(`DROP TABLE ${table_id}`);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get the id of all linked tables for the user with the given `user_id`
   * @param userid The id of the user to get linked tables for
   */
  static async getAllTableIds(userid: user_id): Promise<Array<table_id> | errorMessage> {
    try {
      const res = await db.query('SELECT tables FROM user_tables_tracker WHERE user_id = $1', [userid]);
      
      if (!res.rows.length) {
        return [];
      }

      return JSON.parse(res.rows[0].tables);
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  /**
   * Get the amount of linked tables the user with the given `user_id` has
   * @param userid The id of the user to get the amount of linked tables for
   */
  static getUserTablesCount(userid: user_id): number | undefined {
    // ...
    return;
  }

  static async tableExists(table_id: table_id): Promise<boolean | errorMessage> {
    try {
      const res = await api_db.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`, [table_id]);
      return !!res.rows.length;
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  static async getTable(id: table_id, table_name: tablename): Promise<Table | errorMessage> {
    try {
      const res = await db.query(`SELECT * FROM user_tables WHERE table_id = $1`, [id]);
      
      if (!res.rows.length) {
        return `ERROR: Table with id '${table_name}' does not exist`;
      }

      res.rows[0].fields = JSON.parse(res.rows[0].fields);
      return new Table(res.rows[0]);
    } catch (err) {
      return "ERROR: " + (err as Error).message;
    }
  }

  static async updateTable(
    table_id: table_id,
    old_table: ITable,
    new_table: ITable,
    fields_to_add: Array<field> = [],
    fields_to_remove: Array<field> = [],
    fields_to_rename: Array<{ new_name: tablename, old_name: tablename}> = []
): Promise<Table | errorMessage> {
    try {
      if (old_table.description !== new_table.description) {
        await db.query(`UPDATE user_tables SET description = $1 WHERE table_id = $2`, [new_table.description, table_id]);
      }

      // remove fields
      if (fields_to_remove.length) {
        let remove_fields = "";

        for (let i = 0; i < fields_to_remove.length; i++) {
          remove_fields += `${fields_to_remove[i].name}, `;
        }

        await api_db.query(`ALTER TABLE ${table_id} DROP COLUMN ${remove_fields.substring(0, remove_fields.length - 2)}`);
      }

      // add fields
      if (fields_to_add.length) {
        await api_db.query(`ALTER TABLE ${table_id} ADD COLUMN ${this.generateCustomFields(fields_to_add)}`);
        new_table.fields.push(...fields_to_add);
        await db.query(`UPDATE user_tables SET fields = $1 WHERE table_id = $2`, [JSON.stringify(new_table.fields), table_id]);
      }

      // rename fields
      for (let i = 0; i < fields_to_rename.length; i++) {
        await api_db.query(`ALTER TABLE ${table_id} RENAME COLUMN ${fields_to_rename[i].old_name} TO ${fields_to_rename[i].new_name}`);

        let old_fields = old_table.fields;
        old_fields.find((field) => field.name === fields_to_rename[i].old_name)!.name = fields_to_rename[i].new_name;

        await db.query(`UPDATE user_tables SET fields = $1 WHERE table_id = $2`, [JSON.stringify(old_fields), table_id]);
      }

      // rename table
      if (old_table.tablename !== new_table.tablename) {
        // rename table in the database
        await api_db.query(`ALTER TABLE ${table_id} RENAME TO ${new_table.table_id}`);

        // rename serial sequence for table
        await api_db.query(`ALTER SEQUENCE IF EXISTS ${table_id}__id_seq RENAME TO ${new_table.table_id}__id_seq`);

        // rename in user_tables (table metadata)
        await db.query(`UPDATE user_tables SET tablename = $1, table_id = $2 WHERE table_id = $3`, [new_table.tablename, new_table.table_id, table_id]);

        // rename in user_tables_tracker
        const tables = await this.getAllTableIds(old_table.owner_id);

        if (isErrorMessage(tables)) {
          return <errorMessage>tables;
        }

        const new_tables = (tables as Array<table_id>).map((table) => table === table_id ? new_table.table_id : table);
        await db.query(`UPDATE user_tables_tracker SET tables = $1 WHERE user_id = $2`, [JSON.stringify(new_tables), old_table.owner_id]);
      }

      return new Table(new_table);
    } catch (err) {
      const msg = (err as Error).message;

      if ((/^column \"(.*?)\" of relation \"(.*?)\" does not exist$/).test(msg)) {
        const match: RegExpMatchArray = <RegExpMatchArray>msg.match(/^column \"(.*?)\" of relation \"(.*?)\" does not exist$/);
        return `ERROR: field '${match[1]}' does not exist in table '${match[2]}'`;
      }

      return "ERROR: " + msg;
    }
  }
}