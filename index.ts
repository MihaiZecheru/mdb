import { DatabaseUsers, DatabaseUserEnvironments, DatabaseUserTables } from './database-functions';
import { errorMessage, isErrorMessage } from './types/basic';
import { Environment } from './types/environment';
import { User } from './types/user';
import Handle from './handle';

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
app.get('/', (req: any, res: any) => {
  res.send('Hello World!');
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

  const userExists = await DatabaseUsers.getUser(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const user = await DatabaseUsers.updateUser({ id: user_id, username, password, email });
  Handle.functionResult(res, user);
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
app.post('/tables/:user_id', (req: any, res: any) => {
  const user_id = req.params.user_id;

  res.send(`user_id: ${user_id}`);
});

/**
 * Get the tables linked to the user specified by `user_id`
 * 
 * 
 */
app.get('/tables/:user_id/', (req: any, res: any) => {
  
});
  
/**
 * Get the amount of tables linked to the user specified by `user_id`
 * 
 * 
 */
app.get('/tables/:user_id/count', (req: any, res: any) => {
  const user_id = req.params.user_id;
  res.send(`user_id: ${user_id}`);
});

app.listen(port, () => {
  console.log(`MDB is online @ http://localhost:${port}`);
});
