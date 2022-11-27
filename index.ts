import { DatabaseUsers, DatabaseUserTables } from './database-functions';
import { User, IUser } from './types/user';
import { isErrorMessage, TmissingFieldsError } from './types/basic';

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
 * Takes in a series of key-value pairs (fields) and returns an error message if any of the fields are missing
 * The error message is formatted, specifying exactly which fields are missing
 * 
 * @param fields The fields to check
 * @param from Where are the fields missing from?
 * @returns An error message if the fields are missing, otherwise false
 */
function missingFieldsError(fields: { [key: string]: any }, from: "body" | "query" | "params"): TmissingFieldsError | false {
  const missingFields = Object.keys(fields).filter(key => fields[key] === undefined);
  
  if (missingFields.length > 2) {
    const lastMissingField = missingFields.pop();
    return { error: `Missing fields "${missingFields.join('", "')}", and "${lastMissingField}" from ${from}` };
  } else if (missingFields.length === 2) {
    return { error: `Missing fields "${missingFields[0]}" and "${missingFields[1]}" from ${from}` };
  } else if (missingFields.length === 1) {
    return { error: `Missing field "${missingFields[0]}" from ${from}` };
  }

  return false;
}

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
    res.status(400).json(missingFieldsError({ username, password, email }, "body"));
    return;
  }

  const user = await DatabaseUsers.createUser(username, password, email);
  if (isErrorMessage(user)) {
    res.status(400).send({ error: user });
  } else {
    res.status(200).json((<User>user).toJSON());
  }
});

/**
 * Get a user by `user_id`
 * 
 * Sends: the user if found, 
 *        otherwise sends an error message
 */
app.get('/users/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const user = await DatabaseUsers.getUser(user_id);

  if (isErrorMessage(user)) {
    res.status(400).json({ error: user });
  } else if (user) {    
    res.status(200).json((<User>user).toJSON());
  } else {
    res.status(400).json({ error: `User with id '${user_id}' does not exist` });
  }
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

  if (!username && !password && !email) {
    res.status(400).json({ error: `No fields were given to update` });
    return;
  }

  const user = await DatabaseUsers.updateUser({ id: user_id, username, password, email });
  if (isErrorMessage(user)) {
    res.status(400).json({ error: user });
  } else {
    res.status(200).json((<User>user).toJSON());
  }
});

/**
 * Delete a user by `user_id`
 * 
 * Sends: a confirmation message if successful, 
 *        otherwise sends an error message
 */
app.delete('/users/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;
  const userExists = await DatabaseUsers.userExists(user_id);
  const success = await DatabaseUsers.deleteUser(user_id);

  if (!userExists) {
    res.status(400).json({ error: `User with id '${user_id}' does not exist` });
    return;
  }

  if (success) {
    res.status(200).json({ message: `User with id '${user_id}' has been successfully deleted` });
  } else {
    res.status(500).json({ error: `User with id '${user_id}' could not be deleted due to an unknown error` });
  }
});

app.post('/environments/:user_id', async (req: any, res: any) => {
  const user_id = req.params.user_id;

  const environment_name = req.body.environment_name;
  const environment_description = req.body.environment_description;

  if (!environment_name || !environment_description) {
    res.status(400).json(missingFieldsError({ environment_name, environment_description }, "body"));
    return;
  }

  const userExists = await DatabaseUsers.userExists(user_id);

  if (!userExists) {
    res.status(400).json({ error: `User with id '${user_id}' does not exist` });
    return;
  }

  res.json({ message: "success" });

  // const environment = await DatabaseUserEnvironments.createEnvironment(user_id, environment_name, environment_description);

  // if (isErrorMessage(environment)) {
  //   res.status(400).json({ error: environment });
  // } else {
  //   res.status(200).json((<Environment>environment).toJSON());
  // }
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
