import { DatabaseUserEnvironments } from "../database-functions";
import { env_name, tablename, user_id } from "./basic";

export interface IEnvironment {
  owner_id: user_id;
  name: env_name;
  description: string;
  tables: Array<tablename>;
}

export class Environment implements IEnvironment {
  public readonly owner_id: user_id;
  public name: env_name;
  public description: string;
  public tables: Array<tablename>;

  public constructor(env: IEnvironment) {
    if (typeof env.tables === 'string') {
      env.tables = JSON.parse(env.tables);
    }
    
    this.owner_id = env.owner_id;
    this.name = env.name;
    this.description = env.description;
    this.tables = env.tables;
  }

  public toJSON(): IEnvironment {
    return {
      owner_id: this.owner_id,
      name: this.name,
      description: this.description,
      tables: this.tables
    };
  }

  /**
   * Update the environment's name in the database
   * @param name The environment's new name
   */
  public updateName(name: string): void {
    this.name = name;
    DatabaseUserEnvironments.updateEnvironment(this, true);
  }

  /**
   * Update the environment's description in the database
   * @param description The environment's new description
   */
   public updateDescription(description: string): void {
    this.description = description;
    DatabaseUserEnvironments.updateEnvironment(this, false);
  }

  /**
   * Returns the environment as an interface, synonymous with toJSON()
   * @returns The interface version of the environment
   */
   public toInterface(): IEnvironment {
    return this.toJSON();
  }

  /**
   * Opposite of toJSON(); stringifies the environment
   * @returns The environment as a stringified JSON object
   */
   public stringify(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Parses a stringified user into a Environment object
   * @param json The stringified JSON object
   * @returns The Environment object
   */
  public static parseEnvironment(json: string): Environment {
    return new Environment(JSON.parse(json));
  }

  /**
   * Creates an instance of the Environment class by accepting the environment's owner, name, and description
   * The tables array is initialized to an empty array
   * 
   * @param owner The id of the owner of the environment
   * @param name The environment's name
   * @param description The environment's description
   * @returns An instance of the Environment class
   */
  public static newEnvironment(owner_id: user_id, name: string, description: string): Environment {
    return new Environment({ owner_id, name, description, tables: [] });
  }
}