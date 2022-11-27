import { DatabaseUsers } from '../database-functions';
import { user_id } from './basic';

export interface IUser {
  id: user_id;
  username: string;
  password: string;
  email: string;
}

export class User implements IUser {
  public readonly id: user_id;
  public username: string;
  public password: string;
  public email: string;

  public constructor(user: IUser) {
    this.id = user.id;
    this.username = user.username;
    this.password = user.password;
    this.email = user.email;
  }

  /**
   * Updates the user's username in the database
   * @param username The user's new username
   */
   public updateUsername(username: string): void {
    this.username = username;
    DatabaseUsers.updateUser(this);
  }
  
  /**
   * Updates the user's password in the database
   * @param password The user's new password
   */
   public updatePassword(password: string): void {
    this.password = password;
    DatabaseUsers.updateUser(this);
  }

  /**
   * Updates the user's email in the database
   * @param email The user's new email
   */
   public updateEmail(email: string): void {
    this.email = email;
    DatabaseUsers.updateUser(this);
  }

  /**
   * Parses a stringified user into a User object
   * @param json The stringified JSON object
   * @returns The User object
   */
   public static parseUser(json: string): User {
    return new User(JSON.parse(json));
  }
  
  /**
   * Returns the user as a JSON object, synonymous with toInterface()
   * @returns The user as a JSON object
   */
   public toJSON(): IUser {
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
   public toInterface(): IUser {
    return this.toJSON();
  }

  /**
   * Opposite of toJSON(); stringifies the user
   * @returns The user as a stringified JSON object
   */
   public stringify(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Creates an instance of the User class by accepting the user's id, username, password, and email
   * @param id The user's id
   * @param username The user's username
   * @param password The user's password
   * @param email The user's email
   * @returns An instance of the User class
   */
   public static newUser(id: user_id, username: string, password: string, email: string): User {
    return new User({ id, username, password, email });
  }
}