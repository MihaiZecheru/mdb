import { DatabaseUsers, DatabaseUserTables } from './database-functions';
import { User, IUser } from './types/user';
import { isErrorMessage } from './types/basic';

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
  const username = req.body.username;
  const password = req.body.password;
  const email = req.body.email;
  
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
    res.status(400).json({ error: "No fields to update" });
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
  } else if (success) {
    res.status(200).json({ message: `User with id '${user_id}' has been successfully deleted` });
  } else {
    res.status(500).json({ error: `User with id '${user_id}' could not be deleted due to an unknown error` });
  }
});

/**
 * Create a table and then link it to the user with the given `user_id`
 * The table fields are specified in the request body
 * 
 * 
 */
app.post('/user_tables/:user_id', (req: any, res: any) => {
  const user_id = req.params.user_id;

  res.send(`user_id: ${user_id}`);
});

/**
 * Get the tables linked to the user specified by `user_id`
 * 
 * 
 */
app.get('/user_tables/:user_id/', (req: any, res: any) => {
  
});
  
/**
 * Get the amount of tables linked to the user specified by `user_id`
 * 
 * 
 */
app.get('/user_tables/:user_id/count', (req: any, res: any) => {
  const user_id = req.params.user_id;
  res.send(`user_id: ${user_id}`);
});

app.listen(port, () => {
  console.log(`MDB is online @ http://localhost:${port}`);
});
