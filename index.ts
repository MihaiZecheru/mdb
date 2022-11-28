import { DatabaseUsers, DatabaseUserEnvironments, DatabaseUserTables } from './database-functions';
import { errorMessage, isErrorMessage, field, typeIsVarchar, tableId } from './types/basic';
import { Environment } from './types/environment';
import { User } from './types/user';
import Handle from './handle';
import { ITable, Table } from './types/table';

require('dotenv').config();
const port = process.env['PORT'];

const express = require('express');
const app = express();
app.use(express.json());

/**
 * Home page of the application
 * 
 * Sends: the help message / link to the docs
 */
app.get('/', async (req: any, res: any) => {
  res.send('Hello World!');
  // const before = Date.now();
  // res.send(await DatabaseUsers.createUser("tester", "tester", "tester"));
  // const after = Date.now();
  // console.log(`Time: ${after - before}ms`);
});

/**
 * Creates a new user
 * 
 * Sends: the new user as a JSON object if successful, 
 *        otherwise sends the db error message
 */
app.post('/users/', async (req: any, res: any) => {
  const username = req.body?.username;
  const password = req.body?.password;
  const email = req.body?.email;
  
  if (!username || !password || !email) {
    return Handle.missingFieldsError({ username, password, email }, "body", res);
  }

  const user = await DatabaseUsers.createUser(username, password, email);
  Handle.functionResult(res, user);
});

/**
 * Get a user by `user_id`
 * 
 * Sends: the user if found, 
 *        otherwise sends an error message
 */
app.get('/users/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  if (Handle.invalidUserId(user_id, res)) return;

  const user = await DatabaseUsers.getUser(user_id);

  if (!user) {
    return res.status(400).json({ error: `User with id '${user_id}' does not exist` });
  }

  Handle.functionResult(res, <User | errorMessage>user);
});

app.get('/users/:user_id/username', async (req: any, res: any) => {
  const user = await Handle.APIcall_GetUsersProperty(req, res);
  if (!user) return;

  res.status(200).json({ username: (<User>user).username });
});

app.get('/users/:user_id/password', async (req: any, res: any) => {
  const user = await Handle.APIcall_GetUsersProperty(req, res);
  if (!user) return;

  res.status(200).json({ password: (<User>user).password });
});

app.get('/users/:user_id/email', async (req: any, res: any) => {
  const user = await Handle.APIcall_GetUsersProperty(req, res);
  if (!user) return;

  res.status(200).json({ email: (<User>user).email });
});

/**
 * Update the user with the given `user_id`
 * Fields to update: (username, password, email)
 * 
 * Sends: the updated user if successful
 *        otherwise sends an error message
 */
app.patch('/users/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const username = req.body?.username;
  const password = req.body?.password;
  const email = req.body?.email;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!username && !password && !email) {
    return res.status(400).json({ error: `No fields were given to update` });
  }

  let user = await DatabaseUsers.getUser(user_id);
  if (Handle.userExists(user, res, user_id)) return;
  user = <User>user;
  
  const new_user = await DatabaseUsers.updateUser({ id: user_id, username: username || user.username, password: password || user.password, email: email || user.email });
  Handle.functionResult(res, new_user);
});

/**
 * Delete the user with the given `user_id`
 * 
 * Sends: a confirmation message if successful, 
 *        otherwise sends an error message
 */
app.delete('/users/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  if (Handle.invalidUserId(user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;
  
  const success = await DatabaseUsers.deleteUser(user_id);

  if (success) {
    res.status(200).json({ message: `User with id '${user_id}' has been successfully deleted` });
  } else {
    res.status(500).json({ error: `User with id '${user_id}' could not be deleted due to an unknown error` });
  }
});

/**
 * Create a new environment for a user with the given `user_id`
 * 
 * Sends: the new environment if successful,
 *        otherwise sends an error message
 */
app.post('/environments/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const environment_name = req.body.name;
  const environment_description = req.body.description;

  if (environment_name.length > 25) {
    return res.status(400).json({ error: `Table name '${environment_name}' is too long (max length is 31 characters). Given: ${environment_name.length}` });
  }

  if (Handle.invalidUserId(user_id, res)) return;

  if (!environment_name || !environment_description) {
    return Handle.missingFieldsError({ name: environment_name, description: environment_description }, "body", res);
  }

  const user = await DatabaseUsers.getUser(user_id);

  if (!user) {
    return res.status(400).json({ error: `User with id '${user_id}' does not exist` });
  }

  const environment = await DatabaseUserEnvironments.createEnvironment(<User>user, environment_name, environment_description);
  Handle.functionResult(res, environment);
});

/**
 * Deletes an environment with the given `name` in the body from the user with the given `user_id`
 * 
 * Sends: a confirmation message if successful,
 *       otherwise sends an error message
 */
app.delete('/environments/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const environment_name = req.body.name;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!environment_name) {
    return Handle.missingFieldsError({ name: environment_name }, "body", res);
  }

  const envExists = await DatabaseUserEnvironments.environmentExists(user_id, environment_name);
  if (Handle.envExists(envExists, res, environment_name)) return;
  
  const user = await DatabaseUsers.getUser(user_id);

  if (!user) {
    return res.status(400).json({ error: `User with id '${user_id}' does not exist` });
  }

  const success = await DatabaseUserEnvironments.deleteEnvironment(<User>user, environment_name);

  if (success) {
    res.status(200).json({ message: `Environment '${environment_name}' has been successfully deleted` });
  } else {
    res.status(400).json({ error: `Environment '${environment_name}' could not be deleted due to an unknown error` });
  }
});

/**
 * Updates the environment with the given `name` in the body from the user with the given `user_id`
 * Fields to update: (name, description)
 * 
 * Sends: the updated environment if successful,
 *       otherwise sends an error message
 */
app.patch('/environments/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const old_environment_name = req.body.old_name;
  const new_environment_name = req.body.new_name;
  const environment_description = req.body.description;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!new_environment_name && !environment_description) {
    return res.status(400).json({ error: `No fields were given to update (note: the new name must be passed in as 'new_name', not 'name')` });
  } else if (!old_environment_name) {
    return Handle.missingFieldsError({ old_name: old_environment_name }, "body", res);
  }

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;
  
  const old_env = await DatabaseUserEnvironments.getEnvironmentByName(user_id, old_environment_name);
  if (Handle.envExists(old_env, res, old_environment_name)) return;

  const new_env = await DatabaseUserEnvironments.updateEnvironment({
      owner_id: user_id,
      name: new_environment_name || (<Environment>old_env).name,
      description: environment_description || (<Environment>old_env).description,
      tables: (<Environment>old_env).tables
    },
    !!new_environment_name, // is a new name passed?
    new_environment_name ? old_environment_name : false // and if it is, what is the old name?
  );

  Handle.functionResult(res, new_env);
});

/**
 * Get the environment with the given `name` from the user with the given `user_id` (passed as a query param)
 * 
 * Sends: the environment if successful,
 *      otherwise sends an error message
 */
app.get('/environments/:env_name', async (req: any, res: any) => {
  const environment_name = req.params.env_name;
  const user_id = req.query.user_id;

  if (!isNaN(environment_name)) {
    return res.status(400).json({ error: `Environment name '${environment_name}' is invalid (note: this endpoint takes the user_id as a query param, not as a part of the path)` });
  }

  if (!user_id) {
    return Handle.missingFieldsError({ user_id }, "query", res);
  }

  if (Handle.invalidUserId(user_id, res)) return;
  
  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const environment = await DatabaseUserEnvironments.getEnvironmentByName(user_id, environment_name);
  
  if (!environment) {
    return res.status(400).json({ error: `Environment '${environment_name}' does not exist` });
  }

  Handle.functionResult(res, environment);
});

/**
 * Get the amount of environments the user with the given `user_id` has
 * 
 * Sends: the amount of environments if successful,
 *     otherwise sends an error message
 */
app.get('/environments/:user_id/count', async (req: any, res: any) => {
  const user_id = req.params.user_id;

  if (Handle.invalidUserId(user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const count = await DatabaseUserEnvironments.getEnvironmentCount(user_id);

  if (isErrorMessage(count)) {
    res.status(400).json({ error: count });
  } else {
    res.status(200).json({ count });
  }
});

/**
 * Get the `owner_id` of the environment with the given `name` from the user with the given `user_id`
 * 
 * Sends: the `owner_id` if successful,
 *    otherwise sends an error message
 */
app.get('/environments/:env_name/owner_id', async (req: any, res: any) => {
  const result = await Handle.APIcall_GetEnvironmentProperty(req, res);
  if (!result) return; // the func has already sent a response
  
  return res.status(200).json({ owner_id: (<Environment>result).owner_id });
});

/**
 * Get the `description` of the environment with the given `name` from the user with the given `user_id`
 * 
 * Sends: the `description` if successful,
 *    otherwise sends an error message
 */
app.get('/environments/:env_name/description', async (req: any, res: any) => {
  const result = await Handle.APIcall_GetEnvironmentProperty(req, res);
  if (!result) return; // the func has already sent a response

  return res.status(200).json({ description: (<Environment>result).description });
});

/**
 * Get the `tables` of the environment with the given `name` from the user with the given `user_id`
 * 
 * Sends: the `tables` if successful,
 *    otherwise sends an error message
 */
app.get('/environments/:env_name/tables', async (req: any, res: any) => {
  const result = await Handle.APIcall_GetEnvironmentProperty(req, res);
  if (!result) return; // the func has already sent a response

  return res.status(200).json({ tables: (<Environment>result).tables });
});

/**
 * Create a table and then link it to the user with the given `user_id`
 * The table fields are specified in the request body
 * 
 * Sends: the created table schema if successful,
 *    otherwise sends an error message
 */
app.post('/tables/:user_id/:env_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.body.table_name;
  const table_description = req.body.table_description;
  let table_fields = req.body.fields;

  if (table_name.length > 31) {
    return res.status(400).json({ error: `Table name '${table_name}' is too long (max length is 31 characters). Given: ${table_name.length}` });
  }

  if (Handle.invalidUserId(user_id, res)) return;

  if (!table_name || !table_description || !table_fields) {
    return Handle.missingFieldsError({ table_name, table_description, table_fields }, "body", res);
  }
  
  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const env_exists = await DatabaseUserEnvironments.environmentExists(user_id, env_name);
  if (Handle.envExists(env_exists, res, env_name)) return;

  const formatted_table_fields: Array<field> = Object.keys(table_fields).map((key) => {
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
      if (Handle.invalidDefaultValue(field.default, field.type, res)) return;
    }
    
    if (field.auto_date && !(["date", "time", "datetime"].includes(field.type))) {
      return res.status(400).json({ error: `Field '${field.name}' has 'auto_date' enabled but is not of the 'date', 'time', or 'datetime' type` });
    }
    
    if (field.auto_date && (field.default || typeof field.setNotNull !== 'undefined')) {
      return res.status(400).json({ error: `Field '${field.name}' has 'auto_date' enabled but was given a 'default' and/or a 'setNotNull' value. When enabling 'auto_date', niether a 'default' or a 'setNotNull' value should be passed` });
    }
  };
  
  // create the table (api_db) and then link it to the user (user_tables in main_db)
  const table = await DatabaseUserTables.createTable(user_id, env_name, table_name, table_description, formatted_table_fields);
  Handle.functionResult(res, table);
});

app.delete('/tables/:user_id/:env_name/:table_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  
  if (Handle.invalidUserId(user_id, res)) return;
  
  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const env_exists = await DatabaseUserEnvironments.environmentExists(user_id, env_name);
  if (Handle.envExists(env_exists, res, env_name)) return;

  const table_exists = await DatabaseUserTables.tableExists(tableId(user_id, env_name, table_name));
  if (Handle.tableExists(table_exists, res, table_name)) return;
  
  const success = await DatabaseUserTables.deleteTable(user_id, env_name, tableId(user_id, env_name, table_name));
  
  if (success) {
    return res.status(200).json({ message: `Table with name '${table_name}' has been successfully deleted` });
  } else {
    return res.status(400).json({ error: `Table with name '${table_name}' could not be deleted due to an unknown error` });
  }
});

app.patch('/tables/:user_id/:env_name/:table_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const new_table_name = req.body.table_name;
  const table_description = req.body.table_description;
  const table_fields = req.body.fields;

  if (Handle.invalidUserId(user_id, res)) return;
  
  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;
  
  const env_exists = await DatabaseUserEnvironments.environmentExists(user_id, env_name);
  if (Handle.envExists(env_exists, res, env_name)) return;
  
  const table_id = tableId(user_id, env_name, table_name);

  let old_table = await DatabaseUserTables.getTable(table_id, table_name);
  console.log(old_table)
  if (Handle.tableExists(old_table, res, table_name)) return;
  old_table = <Table>old_table;

  const new_table: ITable = {
    owner_id: parseInt(user_id), // same
    environment_name: env_name, // same
    table_id: new_table_name ? tableId(user_id, env_name, new_table_name) : old_table.table_id,
    tablename: new_table_name || old_table.tablename,
    description: table_description || old_table.description,
    fields: table_fields || old_table.fields,
  };

  const table = await DatabaseUserTables.updateTable(table_id, old_table, new_table);
  // TODO: go to the update table function and test to make sure the part about new fields / removing fields works
  Handle.functionResult(res, table);
});

/**
 * Get a table by its name from the database.
 */
app.get('/tables/:user_id/:env_name/:table_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;

  if (Handle.invalidUserId(user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const env_exists = await DatabaseUserEnvironments.environmentExists(user_id, env_name);
  if (Handle.envExists(env_exists, res, env_name)) return;

  const table_exists = await DatabaseUserTables.tableExists(tableId(user_id, env_name, table_name));
  if (Handle.tableExists(table_exists, res, table_name)) return;

  const table = await DatabaseUserTables.getTable(tableId(user_id, env_name, table_name), table_name);
  Handle.functionResult(res, table);
});

/**
 * Get the tables linked to the user specified by `user_id`
 * 
 * 
 */
app.get('/tables/:user_id/', async (req: any, res: any) => {
  
});
  
/**
 * Get the amount of tables linked to the user specified by `user_id`
 * 
 * 
 */
app.get('/tables/:user_id/count', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  res.send(`user_id: ${user_id}`);
});

app.listen(port, () => {
  console.log(`MDB is online @ http://localhost:${port}`);
});
