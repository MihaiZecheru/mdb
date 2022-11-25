import { user_id } from './basic';

export interface IUser {
  id: user_id;
  username: string;
  password: string;
  email: string;
}

export class User implements IUser {
  readonly id: user_id;
  username: string;
  password: string;
  email: string;

  constructor(user: IUser) {
    this.id = user.id;
    this.username = user.username;
    this.password = user.password;
    this.email = user.email;
  }

  /**
   * Updates the user's username in the database
   * @param username The user's new username
   */
  updateUsername(username: string): void {
    this.username = username;
  }
  
  /**
   * Updates the user's password in the database
   * @param password The user's new password
   */
  updatePassword(password: string): void {
    this.password = password;
  }

  /**
   * Updates the user's email in the database
   * @param email The user's new email
   */
  updateEmail(email: string): void {
    this.email = email;
  }

  /**
   * Parses a stringified user into a User object
   * @param json The stringified JSON object
   * @returns 
   */
  static parseUser(json: string): User {
    return new User(JSON.parse(json));
  }
  
  /**
   * Returns the user as a JSON object, synonymous with toInterface()
   * @returns The user as a JSON object
   */
  toJSON(): IUser {
    return {
      id: this.id,
      username: this.username,
      password: this.password,
      email: this.email,
    };
  }

  /**
   * Returns the user as an interface, synonymous with toJSON()
   * @returns The interface version of the user
   */
  toInterface(): IUser {
    return this.toJSON();
  }

  /**
   * Opposite of toJSON(); stringifies the user
   * @returns The user as a stringified JSON object
   */
  stringify(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Creates an instance of the User class by accepting the user's username, password, and email, 
   * then generating a unique id and assigning it to the user
   * @param username The user's username
   * @param password The user's password
   * @param email The user's email
   * @returns An instance of the User class
   */
  static newUser(id: user_id, username: string, password: string, email: string): User {
    return new User({ id, username, password, email });
  }
}