import { DatabaseUsers, DatabaseUserEnvironments, DatabaseUserTables } from './database-functions';
import { User, IUser } from './types/user';
import { errorMessage, isErrorMessage } from './types/basic';
import { Environment } from './types/environment';
import { Handle } from './handle';

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
 * Add a new user to the `users` table
 * 
 * Sends: the new user as a JSON object if successful, 
 *        otherwise sends the db error message
 */
app.post('/users/', async (req: any, res: any) => {
  const username = req.body?.username;
  const password = req.body?.password;
  const email = req.body?.email;
  
  if (!username || !password || !email) {
    Handle.missingFieldsError({ username, password, email }, "body", res);
    return;
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
    res.status(400).json({ error: `User with id '${user_id}' does not exist` });
    return;
  }

  Handle.functionResult(res, <User | errorMessage>user);
});

/**
 * Update the user with the given `user_id`s information
 * (username, password, email)
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
    res.status(400).json({ error: `No fields were given to update` });
    return;
  }

  const userExists = await DatabaseUsers.getUser(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const user = await DatabaseUsers.updateUser({ id: user_id, username, password, email });
  Handle.functionResult(res, user);
});

/**
 * Delete a user by `user_id`
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

app.post('/environments/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const environment_name = req.body.name;
  const environment_description = req.body.description;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!environment_name || !environment_description) {
    Handle.missingFieldsError({ name: environment_name, description: environment_description }, "body", res);
    return;
  }

  const user = await DatabaseUsers.getUser(user_id);

  if (!user) {
    res.status(400).json({ error: `User with id '${user_id}' does not exist` });
    return;
  }

  const environment = await DatabaseUserEnvironments.createEnvironment(<User>user, environment_name, environment_description);
  Handle.functionResult(res, environment);
});

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
    res.status(400).json({ error: `User with id '${user_id}' does not exist` });
    return;
  }

  const success = await DatabaseUserEnvironments.deleteEnvironment(<User>user, environment_name);

  if (success) {
    res.status(200).json({ message: `Environment '${environment_name}' has been successfully deleted` });
  } else {
    res.status(400).json({ error: `Environment '${environment_name}' could not be deleted due to an unknown error` });
  }
});

app.patch('/environments/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const old_environment_name = req.body.old_name;
  const new_environment_name = req.body.new_name;
  const environment_description = req.body.description;

  if (Handle.invalidUserId(user_id, res)) return;

  if (!new_environment_name && !environment_description) {
    res.status(400).json({ error: `No fields were given to update (note: the new name must be passed in as 'new_name', not 'name')` });
    return;
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

app.get('/environments/:env_name', async (req: any, res: any) => {
  const environment_name = req.params.env_name;
  const user_id = req.query.user_id;

  if (!isNaN(environment_name)) {
    res.status(400).json({ error: `Environment name '${environment_name}' is invalid (note: this endpoint takes the user_id as a query param, not as a part of the path)` });
    return;
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

app.get('/environments/:env_name/owner_id', async (req: any, res: any) => {
  const env_name = req.params.env_name;
  const user_id = req.query.user_id;

  if (!isNaN(env_name)) {
    res.status(400).json({ error: `Environment name '${env_name}' is invalid (note: this endpoint takes the user_id as a query param, not as a part of the path)` });
    return;
  }

  if (!user_id) {
    return Handle.missingFieldsError({ user_id }, "query", res);
  }

  if (Handle.invalidUserId(user_id, res)) return;

  const userExists = await DatabaseUsers.userExists(user_id);
  if (Handle.userExists(userExists, res, user_id)) return;

  const environment = await DatabaseUserEnvironments.getEnvironmentByName(user_id, env_name);
  if (Handle.envExists(environment, res, env_name)) return;
  
  return res.status(200).json({ owner_id: (<Environment>environment).owner_id });
});

/**
 * Create a table and then link it to the user with the given `user_id`
 * The table fields are specified in the request body
 * 
 * 
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
