import { DatabaseUsers, DatabaseUserEnvironments, DatabaseUserTables } from './database-functions';
import { errorMessage, isErrorMessage, field, tableId, table_id, tablename, env_name, user_auth, getFieldTypes } from './types/basic';
import { Environment, IEnvironment } from './types/environment';
import { User } from './types/user';
import { ITable, Table } from './types/table';
import Handle, { isValidEmail, isValidPhone, isValidUrl } from './handle';
import uuid from './uuid';
import db from './database-config/main-database-config';
import api_db from './database-config/api-database-config';
import { getEmoji, isValidEmoji } from './emoji';

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
  res.status(200).send('Hello World!');
});

/**
 * Documentation page of the application
 * 
 * Sends: the documentation as an HTML page
 */
app.get('/docs/', async (req: any, res: any) => {
  res.send('Hello World!');
});



/***************************/
/********** USERS **********/
/***************************/



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
  const given_auth = req.headers.authorization;
  
  if (!username || !password || !email) {
    return Handle.missingFieldsError({ username, password, email }, "body", res);
  }
  
  if (Handle.spacesInParams(res, username, email)) return;
  if (!Handle.adminAuthorized(given_auth, res)) return;
  
  // validate email
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const auth: user_auth = uuid();
  let user = await DatabaseUsers.createUser(username, password, email, auth);

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
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

  const user = await DatabaseUsers.getUser(user_id);
  Handle.functionResult(res, <User | errorMessage>user);
});

app.get('/users/:user_id/username', async (req: any, res: any) => {
  const user = await Handle.APIcall_GetUsersProperty(req, res);
  if (!user) return;

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  res.status(200).json((<User>user).username);
});

app.get('/users/:user_id/password', async (req: any, res: any) => {
  const user = await Handle.APIcall_GetUsersProperty(req, res);
  if (!user) return;

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  res.status(200).json((<User>user).password);
});

app.get('/users/:user_id/email', async (req: any, res: any) => {
  const user = await Handle.APIcall_GetUsersProperty(req, res);
  if (!user) return;

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  res.status(200).json((<User>user).email);
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
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

  if (!username && !password && !email) {
    return res.status(400).json({ error: `No fields were given to update` });
  }
  
  // validate email
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  if (Handle.spacesInParams(res, username, email)) return;

  let user = await DatabaseUsers.getUser(user_id);
  if (Handle.userExists(user, res, user_id)) return;
  user = <User>user;
  
  const new_user = await DatabaseUsers.updateUser({ id: user_id, username: username || user.username, password: password || user.password, email: email || user.email, auth: user.auth });
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
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

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
 * Get the tables linked to the user specified by `user_id`
 * 
 * Sends: the id of all tables linked to the user,
 *        otherwise, an error message
 */
 app.get('/users/:user_id/tables', async (req: any, res: any) => {
  const user_id = req.params.user_id;

  if (Handle.invalidUserId(user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const tables = await DatabaseUsers.getTables(user_id, true);
  
  if (isErrorMessage(tables)) {
    return res.status(400).json({ error: <errorMessage>tables });
  }

  const r = req.query?.return;

  if (r === "id" || r === "ids") {
    const ids: Array<table_id> = (<Array<ITable>>tables).map(table => table.table_id);
    return res.status(200).json(ids);
  } else if (r === "name" || r === "names") {
    const names: Array<tablename> = (<Array<ITable>>tables).map(table => table.tablename);
    return res.status(200).json(names);
  } else if (r === "id_name" || r === "id_names" || r === "ids_name" || r === "ids_names") {
    const id_names: Array<{ id: table_id, name: tablename }> = (<Array<ITable>>tables).map(table => ({ id: table.table_id, name: table.tablename }));
    return res.status(200).json(id_names);
  }

  // else: the whole table
  return res.status(200).json(<Array<table_id>>tables);
});

/**
 * Get the amount of tables linked to the user specified by `user_id`
 * 
 * Sends: the amount of tables linked to the user,
 *        otherwise, an error message
 */
 app.get('/users/:user_id/tables/count', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const count = await DatabaseUsers.getTablesCount(user_id);
  
  if (isErrorMessage(count)) {
    return res.status(400).json({ error: <errorMessage>count });
  }

  return res.status(200).json(<number>count);
});

/**
 * Get the environments linked to the user specified by `user_id`
 * 
 * Sends: the id of all environments linked to the user,
 *        otherwise, an error message
 */
 app.get('/users/:user_id/environments', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const envs = await DatabaseUserEnvironments.getAllEnvironments(user_id);
  
  if (isErrorMessage(envs)) {
    return res.status(400).json({ error: <errorMessage>envs });
  }

  const r = req.query?.return;

  if (r === "name" || r === "names") {
    const names: Array<env_name> = (<Array<IEnvironment>>envs).map(env => env.name);
    return res.status(200).json(names);
  } else if (r === "description" || r === "descriptions") {
    const descriptions: Array<string> = (<Array<IEnvironment>>envs).map(env => env.description);
    return res.status(200).json(descriptions);
  } else if (r === "table_id" || r === "table_name") {
    const table_ids: Array<table_id[]> = (<Array<IEnvironment>>envs).map(env => env.tables);
    return res.status(200).json(table_ids);
  }

  // else: the whole environment
  return res.status(200).json(<Array<IEnvironment>>envs);
});

/**
 * Get the amount of environments the user with the given `user_id` has
 * 
 * Sends: the amount of environments if successful,
 *     otherwise sends an error message
 */
 app.get('/users/:user_id/environments/count', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const count = await DatabaseUserEnvironments.getEnvironmentCount(user_id);

  if (isErrorMessage(count)) {
    res.status(400).json({ error: <errorMessage>count });
  } else {
    res.status(200).json(count);
  }
});



/**********************************/
/********** ENVIRONMENTS **********/
/**********************************/



/**
 * Create a new environment for a user with the given `user_id`
 * 
 * Sends: the new environment if successful,
 *        otherwise sends an error message
 */
app.post('/environments/', async (req: any, res: any) => {
  const user_id = req.query.user_id;
  const environment_name = req.body.name;
  const environment_description = req.body.description;
  const auth = req.headers.authorization;

  if (environment_name.length > 25) {
    return res.status(400).json({ error: `Table name '${environment_name}' is too long (max length is 31 characters). Given: ${environment_name.length}` });
  }

  if (!user_id) {
    return Handle.missingFieldsError({ user_id }, "query", res);
  }

  if (Handle.spacesInParams(res, environment_name)) return;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

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
app.delete('/environments/:env_name/', async (req: any, res: any) => {
  const user_id = req.query.user_id;
  const environment_name = req.params.env_name;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

  if (!user_id) {
    return Handle.missingFieldsError({ user_id }, "query", res);
  }

  const user = await DatabaseUsers.getUser(user_id);

  if (!user) {
    return res.status(400).json({ error: `User with id '${user_id}' does not exist` });
  }

  const envExists = await DatabaseUserEnvironments.environmentExists(user_id, environment_name);
  if (Handle.envExists(envExists, res, environment_name)) return;

  const success = await DatabaseUserEnvironments.deleteEnvironment(<User>user, environment_name);

  if (success) {
    res.status(200).json({ message: `Environment '${environment_name}' has been successfully deleted` });
  } else {
    res.status(400).json({ error: `Environment '${environment_name}' could not be deleted due to an unknown error` });
  }
});

/**
 * Updates the environment with the given `old_name` from the user with the given `user_id`
 * Fields to update: (name, description)
 * 
 * Sends: the updated environment if successful,
 *       otherwise sends an error message
 */
app.patch('/environments/:user_id/:old_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const old_environment_name = req.params.old_name;
  const new_environment_name = req.body.new_name;
  const environment_description = req.body.description;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

  if (!new_environment_name && !environment_description) {
    return res.status(400).json({ error: `No fields were given to update (note: the new name must be passed in as 'new_name', not 'name')` });
  } else if (!old_environment_name) {
    return Handle.missingFieldsError({ old_name: old_environment_name }, "body", res);
  }

  if (Handle.spacesInParams(res, new_environment_name)) return;

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
  const auth = req.headers.authorization;

  if (!isNaN(environment_name)) {
    return res.status(400).json({ error: `Environment name '${environment_name}' is invalid (note: this endpoint takes the user_id as a query param, not as a part of the path)` });
  }

  if (!user_id) {
    return Handle.missingFieldsError({ user_id }, "query", res);
  }

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;
  
  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const environment = await DatabaseUserEnvironments.getEnvironmentByName(user_id, environment_name);
  
  if (!environment) {
    return res.status(400).json({ error: `Environment '${environment_name}' does not exist` });
  }

  Handle.functionResult(res, environment);
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

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  return res.status(200).json((<Environment>result).description);
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

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  return res.status(200).json((<Environment>result).tables);
});



/****************************/
/********** TABLES **********/
/****************************/



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
  const auth = req.headers.authorization;
  let table_fields = req.body.fields;

  if (table_name === '_id') {
    return res.status(400).json({ error: `Field name '${table_name}' is reserved` });
  }

  if (Handle.invalidNameAndDescLengths(table_name, table_description, res)) return;
  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;
  if (Handle.spacesInParams(res, env_name, table_name)) return;

  if (!table_name || !table_description || !table_fields) {
    return Handle.missingFieldsError({ table_name, table_description, table_fields }, "body", res);
  }
  
  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const env_exists = await DatabaseUserEnvironments.environmentExists(user_id, env_name);
  if (Handle.envExists(env_exists, res, env_name)) return;

  const result: [boolean, any] = Handle.formatTableFieldsAndValidation(table_fields, res);
  if (result[0]) return; // api call was resolved in the function
  
  const formatted_table_fields: Array<field> = result[1];
  
  // create the table (api_db) and then link it to the user (user_tables in main_db)
  const table = await DatabaseUserTables.createTable(user_id, env_name, table_name, table_description, formatted_table_fields);
  Handle.functionResult(res, table);
});

app.delete('/tables/:user_id/:env_name/:table_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization;
  
  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;
  
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
  const auth = req.headers.authorization;
  
  // get fields to add, remove, and rename
  let fields_to_add: Array<field> = req.body.add_fields;
  let fields_to_remove: Array<field> = req.body.remove_fields;
  let fields_to_rename: { [old_name: string]: string } = req.body.rename_fields;
  
  if (new_table_name && Handle.spacesInParams(res, new_table_name)) return;
  if (Handle.invalidNameAndDescLengths(table_name, table_description, res)) return;
  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;
  
  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;
  
  const env_exists = await DatabaseUserEnvironments.environmentExists(user_id, env_name);
  if (Handle.envExists(env_exists, res, env_name)) return;
  
  const table_id = tableId(user_id, env_name, table_name);
  
  let old_table = await DatabaseUserTables.getTable(table_id, table_name);
  if (Handle.tableExists(old_table, res, table_name)) return;
  old_table = <Table>old_table;
  
  const new_table: ITable = {
    owner_id: parseInt(user_id), // same
    environment_name: env_name, // same
    table_id: new_table_name ? tableId(user_id, env_name, new_table_name) : old_table.table_id,
    tablename: new_table_name || old_table.tablename,
    description: table_description || old_table.description,
    fields: old_table.fields,
  };
  
  if (fields_to_add) {
    const add_result = Handle.formatTableFieldsAndValidation(fields_to_add, res);
    if (add_result[0]) return; // api call was resolved in the function
    fields_to_add = add_result[1];
  }
  
  if (fields_to_remove) {
    const remove_result = Handle.formatTableFieldsAndValidation(fields_to_remove, res);
    if (remove_result[0]) return; // api call was resolved in the function
    fields_to_remove = remove_result[1];
  }
  
  // validate fields_to_rename
  var fields_to_rename_formatted: Array<{ old_name: tablename, new_name: tablename}> = [];
  if (fields_to_rename) {
    for (let [old_name, new_name] of Object.entries(fields_to_rename)) {
      // check if the old name exists
      if (!old_table.fields.find((field) => field.name === old_name)) {
        return res.status(400).json({ error: `Field with name '${old_name}' does not exist in table '${table_name}'` });
      }
      
      // check if the new name is valid
      if (Handle.invalidNameAndDescLengths(new_name, "", res)) return;

      // check if the new name already exists
      if (old_table.fields.find((field) => field.name === new_name)) {
        return res.status(400).json({ error: `Field with name '${new_name}' already exists in table '${table_name}'` });
      }

      // check if the new name is a reserved word
      if (new_name === '_id') {
        return res.status(400).json({ error: `Field name '${new_name}' is reserved` });
      }

      // check if the new name is the same as the old name
      if (old_name === new_name) {
        return res.status(400).json({ error: `New field name '${new_name}' cannot be the same as the old field name` });
      }

      fields_to_rename_formatted.push({ old_name, new_name });
    }
  }
  
  const table = await DatabaseUserTables.updateTable(table_id, old_table, new_table, (fields_to_add) ? fields_to_add : [], (fields_to_remove) ? fields_to_remove : [], (fields_to_rename) ? fields_to_rename_formatted : []);
  Handle.functionResult(res, table);
});

/**
 * Get a table by its name from the database.
 */
app.get('/tables/:user_id/:env_name/:table_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;
  if (await Handle.authorization(auth, user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const env_exists = await DatabaseUserEnvironments.environmentExists(user_id, env_name);
  if (Handle.envExists(env_exists, res, env_name)) return;

  const table = await DatabaseUserTables.getTable(tableId(user_id, env_name, table_name), table_name);
  Handle.functionResult(res, table);
});

/**
 * Get the table_id of a table named 'table_name' from the database.
 */
app.get('/tables/:user_id/:env_name/:table_name/id', async (req: any, res: any) => {
  const table = await Handle.APIcall_GetTablesProperty(req, res);
  if (!table) return;

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  res.status(200).json((<Table>table).table_id);
});

/**
 * Get the tablename of a table named 'table_name' from the database.
 */
app.get('/tables/:user_id/:env_name/:table_name/name', async (req: any, res: any) => {
  const table = await Handle.APIcall_GetTablesProperty(req, res);
  if (!table) return;

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  res.status(200).json((<Table>table).tablename);
});

/**
 * Get the environment_name of a table named 'table_name' from the database.
 */
app.get('/tables/:user_id/:env_name/:table_name/env_name', async (req: any, res: any) => {
  const table = await Handle.APIcall_GetTablesProperty(req, res);
  if (!table) return;

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  res.status(200).json((<Table>table).environment_name);
});

/**
 * Get the description of a table named 'table_name' from the database.
 */
app.get('/tables/:user_id/:env_name/:table_name/description', async (req: any, res: any) => {
  const table = await Handle.APIcall_GetTablesProperty(req, res);
  if (!table) return;

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  res.status(200).json((<Table>table).description);
});

/**
 * Get the fields of a table named 'table_name' from the database.
 */
app.get('/tables/:user_id/:env_name/:table_name/fields', async (req: any, res: any) => {
  const table = await Handle.APIcall_GetTablesProperty(req, res);
  if (!table) return;

  const auth = req.headers.authorization;
  if (await Handle.authorization(auth, req.params.user_id, res)) return;

  res.status(200).json((<Table>table).fields);
});



/****************************/
/*********** APIS ***********/
/****************************

   In order to increase performance,
   database queries are done locally
   in the function, unlike the other
   routes ie. /tables/ & /environments/

/****************************/
/*********** APIS ***********/
/****************************/



app.get('/api/:user_id/:env_name/:table_name/all', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization; 
  const query = req.query;

  if (Handle.invalidUserId(user_id, res)) return;
  
  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);
    const response = await api_db.query(`SELECT * FROM ${table_id}`);
    const field_types = await getFieldTypes(table_id);

    for (let i = 0; i < response.rows.length; i++) {
      const entry = response.rows[i];

      for (const field in entry) {
        if (field_types[field] === 'array') {
          entry[field] = JSON.parse(entry[field]);
        } else if (field_types[field] === 'json') {
          entry[field] = JSON.parse(entry[field]);
        } else if (field_types[field] === 'emoji' && entry[field][0] === ':') {
          entry[field] = getEmoji(entry[field]);
        }
      }
    }

    res.status(200).json(response.rows);
  } catch (err) {
    let msg = (err as Error).message;
    if (/relation \"(.*?)\" does not exist/.test(msg))
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});

app.get('/api/:user_id/:env_name/:table_name/:id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization; 
  const entry_id = req.params.id;

  if (Handle.invalidUserId(user_id, res)) return;
  
  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);

    /* get one entry */
    const response = await api_db.query(`SELECT * FROM ${table_id} WHERE _id = $1 LIMIT 1`, [entry_id]);

    if (!response.rows.length) {
      throw new Error(`No entry with id '${entry_id}' exists in table '${table_name}'`);
    }

    const entry = response.rows[0];
    const field_types = await getFieldTypes(table_id);

    for (const field in entry) {
      if (field_types[field] === 'array') {
        entry[field] = JSON.parse(entry[field]);
      } else if (field_types[field] === 'json') {
        entry[field] = JSON.parse(entry[field]);
      } else if (field_types[field] === 'emoji' && entry[field][0] === ':') {
        entry[field] = getEmoji(entry[field]);
      }
    }

    return res.status(200).json(entry);
  } catch (err) {
    let msg = (err as Error).message;
    if (/relation \"(.*?)\" does not exist/.test(msg))
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});

/* PATH FOR FILTER QUERIES */
app.get('/api/:user_id/:env_name/:table_name/', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization;
  const field_name = req.params.field_name;
  const queries = req.query;

  if (Handle.invalidUserId(user_id, res)) return;
  
  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);

    /* check for filter queries */

    if (!Object.keys(queries).length) {
      throw new Error(`No filter queries were provided; to get a specific entry, use the GET /api/:user_id/:env_name/:table_name endpoint, and to get all entries in a table, use the GET /api/:user_id/:env_name/:table_name endpoint.`);
    }

    console.log('queries: ',queries);

  } catch (err) {
    let msg = (err as Error).message;
    if (/^column \"(.*?)\" does not exist$/.test(msg))
      msg = `Field '${field_name}' does not exist`;
    if (/relation \"(.*?)\" does not exist/.test(msg)) 
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});

app.get('/api/:user_id/:env_name/:table_name/:id/:field_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization;
  const field_name = req.params.field_name;
  const id = req.params.id;

  if (Handle.invalidUserId(user_id, res)) return;
  
  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);

    /* get field */
    const response = await api_db.query(`SELECT ${field_name} FROM ${table_id} WHERE _id = $1 LIMIT 1`, [id]);

    if (!response.rows.length) {
      throw new Error(`No entry with id '${id}' exists in table '${table_name}'`);
    }

    let field = response.rows[0][field_name];
    const field_type = JSON.parse((await db.query(`SELECT fields FROM user_tables WHERE table_id = $1`, [table_id])).rows[0].fields).find((f: field) => f.name === field_name).type;

    if (field_type === 'array') {
      field = JSON.parse(field);
    } else if (field_type === 'json') {
      field = JSON.parse(field);
    } else if (field_type === 'emoji' && field[0] === ':') {
      field = getEmoji(field);
    }
    return res.status(200).json(field);
  } catch (err) {
    let msg = (err as Error).message;
    if (/^column \"(.*?)\" does not exist$/.test(msg))
      msg = `Field '${field_name}' does not exist`;
    if (/relation \"(.*?)\" does not exist/.test(msg)) 
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});

app.post('/api/:user_id/:env_name/:table_name', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);

    // get fields
    const fields_raw = JSON.parse((await db.query(`SELECT fields FROM user_tables WHERE table_id = $1`, [table_id])).rows[0].fields);
    const given_fieldnames = Object.keys(req.body);
    
    const fields = fields_raw.reduce((acc: any, field: any) => {
      acc[field.name] = field;
      return acc;
    }, {});

    // check for missing fields
    for (let i = 0; i < fields_raw.length; i++) {
      const field = fields_raw[i];
      if ((field.setNotNull && !field.auto_date) && !given_fieldnames.includes(field.name)) {
        throw new Error(`Field \"${field.name}\" is required`);
      }
    }

    // validate fields
    for (let i = 0; i < given_fieldnames.length; i++) {
      const fieldname = given_fieldnames[i];
      const field = fields[fieldname];

      if (!field) {
        throw new Error(`Field '${fieldname}' does not exist in table '${table_name}'`);
      }

      if (field.type.includes('string') && typeof req.body[fieldname] !== 'string') {
        throw new Error(`Field \"${field.name}\" must be of type \"string\"`);
      } else if (field.type === 'integer' && (typeof req.body[fieldname] !== 'number' || !Number.isInteger(req.body[fieldname]))) {
        throw new Error(`Field \"${field.name}\" must be of type \"integer\"`);
      } else if (field.type === 'float' && (typeof req.body[fieldname] !== 'number' || Number.isInteger(req.body[fieldname]))) {
        throw new Error(`Field \"${field.name}\" must be of type \"float\"`);
      } else if (field.type === 'boolean' && typeof req.body[fieldname] !== 'boolean') {
        throw new Error(`Field \"${field.name}\" must be of type \"boolean\"`);
      } else if (field.type === 'date' && !req.body[fieldname].match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error(`Field \"${field.name}\" must be of type \"date\"`);
      } else if (field.type === 'time' && !req.body[fieldname].match(/^\d{2}:\d{2}:\d{2}$/)) {
        throw new Error(`Field \"${field.name}\" must be of type \"time\"`);
      } else if (field.type === 'datetime' && !req.body[fieldname].test(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
        throw new Error(`Field \"${field.name}\" must be of type \"datetime\"`);
      } else if (field.type === 'url' && !isValidUrl(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"url\"`);
      } else if (field.type === 'email' && !isValidEmail(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"email\"`);
      } else if (field.type === 'phone' && !isValidPhone(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"phone\"`);
      } else if (field.type === 'array' && !Array.isArray(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"array\"`);
      } else if (field.type === 'json' && typeof req.body[fieldname] !== 'object') {
        throw new Error(`Field \"${field.name}\" must be of type \"json\"`);
      } else if (field.type === 'emoji' && !isValidEmoji(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"emoji\"`);
      }

      if (field.type === 'array' || field.type === 'json') {
        req.body[fieldname] = JSON.stringify(req.body[fieldname]);
      }
    }

    // create object to insert
    let entry: { [ key: string ]: unknown } = {};

    for (let i = 0; i < fields_raw.length; i++) {
      const field = fields_raw[i];
      if (req.body[field.name]) {
        entry[field.name] = req.body[field.name];
      } else {
        if (field.defaultValue && field.type !== 'datetime' && !field.auto_date)
          entry[field.name] = field.defaultValue;
      }
    }

    return res.status(200).json(...(await api_db.query(`INSERT INTO ${table_id} (${Object.keys(entry).join(', ')}) VALUES (${Object.keys(entry).map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, Object.values(entry))).rows);
  } catch (err) {
    let msg = (err as Error).message;
    if (/relation \"(.*?)\" does not exist/.test(msg)) 
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});

app.put('/api/:user_id/:env_name/:table_name/:id', async (req: any, res: any) => {
  const entry_id = req.params.id;
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);

    // get fields
    const fields_raw = JSON.parse((await db.query(`SELECT fields FROM user_tables WHERE table_id = $1`, [table_id])).rows[0].fields);
    const given_fieldnames = Object.keys(req.body);
    
    const fields = fields_raw.reduce((acc: any, field: any) => {
      acc[field.name] = field;
      return acc;
    }, {});

    // validate fields
    for (let i = 0; i < given_fieldnames.length; i++) {
      const fieldname = given_fieldnames[i];
      const field = fields[fieldname];

      if (!field) {
        throw new Error(`Field '${fieldname}' does not exist in table '${table_name}'`);
      }

      if (field.type.includes('string') && typeof req.body[fieldname] !== 'string') {
        throw new Error(`Field \"${field.name}\" must be of type \"string\"`);
      } else if (field.type === 'integer' && (typeof req.body[fieldname] !== 'number' || !Number.isInteger(req.body[fieldname]))) {
        throw new Error(`Field \"${field.name}\" must be of type \"integer\"`);
      } else if (field.type === 'float' && (typeof req.body[fieldname] !== 'number' || Number.isInteger(req.body[fieldname]))) {
        throw new Error(`Field \"${field.name}\" must be of type \"float\"`);
      } else if (field.type === 'boolean' && typeof req.body[fieldname] !== 'boolean') {
        throw new Error(`Field \"${field.name}\" must be of type \"boolean\"`);
      } else if (field.type === 'date' && !req.body[fieldname].match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error(`Field \"${field.name}\" must be of type \"date\"`);
      } else if (field.type === 'time' && !req.body[fieldname].match(/^\d{2}:\d{2}:\d{2}$/)) {
        throw new Error(`Field \"${field.name}\" must be of type \"time\"`);
      } else if (field.type === 'datetime' && !req.body[fieldname].test(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
        throw new Error(`Field \"${field.name}\" must be of type \"datetime\"`);
      } else if (field.type === 'url' && !isValidUrl(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"url\"`);
      } else if (field.type === 'email' && !isValidEmail(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"email\"`);
      } else if (field.type === 'phone' && !isValidPhone(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"phone\"`);
      } else if (field.type === 'array' && !Array.isArray(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"array\"`);
      } else if (field.type === 'json' && typeof req.body[fieldname] !== 'object') {
        throw new Error(`Field \"${field.name}\" must be of type \"json\"`);
      } else if (field.type === 'emoji' && !isValidEmoji(req.body[fieldname])) {
        throw new Error(`Field \"${field.name}\" must be of type \"emoji\"`);
      }

      if (field.type === 'array' || field.type === 'json') {
        req.body[fieldname] = JSON.stringify(req.body[fieldname]);
      }
    }

    // update fields
    res.status(200).json(...(await api_db.query(`UPDATE ${table_id} SET ${given_fieldnames.map((fieldname, i) => `${fieldname} = $${i + 1}`).join(', ')} WHERE _id = $${given_fieldnames.length + 1} RETURNING *`, [...given_fieldnames.map(fieldname => req.body[fieldname]), entry_id])).rows);
  } catch (err) {
    let msg = (err as Error).message;
    if (/relation \"(.*?)\" does not exist/.test(msg))
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});

app.put('/api/:user_id/:env_name/:table_name/:id/:field_name', async (req: any, res: any) => {
  const entry_id = req.params.id;
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const field_name = req.params.field_name;
  let field_value = req.body.value;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);

    if (!field_value) {
      throw new Error(`Field value must be provided; { 'value': '...' } should be included in the request body`);
    }

    // get field
    const fields_raw = JSON.parse((await db.query(`SELECT fields FROM user_tables WHERE table_id = $1`, [table_id])).rows[0].fields);
    const field = fields_raw.find((f: field) => f.name === field_name);

    if (!field) {
      throw new Error(`Field '${field.name}' does not exist in table '${table_name}'`);
    }

    // validate field
    if (field.type.includes('string') && typeof field_value !== 'string') {
    throw new Error(`Field \"${field.name}\" must be of type \"string\"`);
    } else if (field.type === 'integer' && (typeof field_value !== 'number' || !Number.isInteger(field_value))) {
      throw new Error(`Field \"${field.name}\" must be of type \"integer\"`);
    } else if (field.type === 'float' && (typeof field_value !== 'number' || Number.isInteger(field_value))) {
      throw new Error(`Field \"${field.name}\" must be of type \"float\"`);
    } else if (field.type === 'boolean' && typeof field_value !== 'boolean') {
      throw new Error(`Field \"${field.name}\" must be of type \"boolean\"`);
    } else if (field.type === 'date' && !field_value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error(`Field \"${field.name}\" must be of type \"date\"`);
    } else if (field.type === 'time' && !field_value.match(/^\d{2}:\d{2}:\d{2}$/)) {
      throw new Error(`Field \"${field.name}\" must be of type \"time\"`);
    } else if (field.type === 'datetime' && !field_value.test(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
      throw new Error(`Field \"${field.name}\" must be of type \"datetime\"`);
    } else if (field.type === 'url' && !isValidUrl(field_value)) {
      throw new Error(`Field \"${field.name}\" must be of type \"url\"`);
    } else if (field.type === 'email' && !isValidEmail(field_value)) {
      throw new Error(`Field \"${field.name}\" must be of type \"email\"`);
    } else if (field.type === 'phone' && !isValidPhone(field_value)) {
      throw new Error(`Field \"${field.name}\" must be of type \"phone\"`);
    } else if (field.type === 'array' && !Array.isArray(field_value)) {
      throw new Error(`Field \"${field.name}\" must be of type \"array\"`);
    } else if (field.type === 'json' && typeof field_value !== 'object') {
      throw new Error(`Field \"${field.name}\" must be of type \"json\"`);
    } else if (field.type === 'emoji' && !isValidEmoji(field_value)) {
      throw new Error(`Field \"${field.name}\" must be of type \"emoji\"`);
    }

    if (field.type === 'array' || field.type === 'json') {
      field_value = JSON.stringify(field_value);
    }

    // update fields
    res.status(200).json(...(await api_db.query(`UPDATE ${table_id} SET ${field_name} = $1 WHERE _id = $2 RETURNING ${field_name}`, [field_value, entry_id])).rows);
  } catch (err) {
    let msg = (err as Error).message;
    if (/relation \"(.*?)\" does not exist/.test(msg)) 
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});

app.delete('/api/:user_id/:env_name/:table_name/:id', async (req: any, res: any) => {
  const entry_id = req.params.id;
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);

    // delete entry
    res.status(200).json(...(await api_db.query(`DELETE FROM ${table_id} WHERE _id = $1 RETURNING *`, [entry_id])).rows);
  } catch (err) {
    let msg = (err as Error).message;
    if (/relation \"(.*?)\" does not exist/.test(msg)) 
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});

app.delete('/api/:user_id/:env_name/:table_name/:id/:field_name', async (req: any, res: any) => {
  const entry_id = req.params.id;
  const user_id = req.params.user_id;
  const env_name = req.params.env_name;
  const table_name = req.params.table_name;
  const field_name = req.params.field_name;
  const auth = req.headers.authorization;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!auth) {
    return res.status(401).json({ error: 'User is not authorized; no authentication header provided' });
  }

  try {
    const auth_response = await db.query(`SELECT auth FROM users WHERE id = $1`, [user_id]);

    if (!auth_response.rows.length) {
      throw new Error(`User with id '${user_id}' does not exist.`);
    }

    const user_auth = auth_response.rows[0].auth;
    if (user_auth !== auth) {
      throw new Error(`User is not authorized`);
    }

    const env_exists = (await db.query(`SELECT 1 FROM user_environments WHERE owner_id = $1 AND name = $2`, [user_id, env_name])).rows.length;

    if (!env_exists) {
      throw new Error(`Environment '${env_name}' does not exist for user '${user_id}'`);
    }
    
    /* skip checking for table existence; if the table doesn't exist an error will be returned, saving a query */

    const table_id = tableId(user_id, env_name, table_name);

    // get specific field
    const fields = JSON.parse((await db.query(`SELECT fields FROM user_tables WHERE table_id = $1`, [table_id])).rows[0]['fields']);
    const field = fields.find((field: field) => field.name === field_name);

    if (!field) {
      throw new Error(`Field '${field_name}' does not exist`);
    }

    // check if field can be deleted
    if (field.setNotNull) {
      // field can't be set to null, therefore it cannot be deleted
      throw new Error(`Field '${field_name}' cannot be deleted (field cannot be NULL)`);
    } else {
      // delete entry
      res.status(200).json(...(await api_db.query(`UPDATE ${table_id} SET ${field_name} = NULL WHERE _id = $1 RETURNING (SELECT ${field_name} FROM ${table_id} WHERE _id = $2)`, [entry_id, entry_id])).rows);
    }
  } catch (err) {
    let msg = (err as Error).message;
    if (/relation \"(.*?)\" does not exist/.test(msg)) 
      msg = `Table '${table_name}' does not exist in environment '${env_name}'`;
    return res.status(400).json({ error: "ERROR: " + msg });
  }
});



/***************************/
/*********** END ***********/
/***************************/



app.listen(port, () => {
  console.log(`MDB is online @ http://localhost:${port}`);
});
