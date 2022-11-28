import { field, tabledescription, tablename, table_id, user_id } from "./basic";

export interface ITable {
  owner_id: user_id;
  table_id: table_id;
  environment_name: string;
  tablename: tablename;
  description: tabledescription;
  fields: Array<field>;
}

export class Table implements ITable {
  owner_id: user_id;
  table_id: table_id;
  environment_name: string;
  tablename: tablename;
  description: tabledescription;
  fields: Array<field>;

  constructor(table: ITable) {
    this.owner_id = table.owner_id;
    this.table_id = table.table_id;
    this.environment_name = table.environment_name;
    this.tablename = table.tablename;
    this.description = table.description;
    this.fields = table.fields;
  }

  static newTable(owner_id: user_id, table_id: table_id, environment_name: string, tablename: tablename, description: tabledescription, fields: string): Table;
  static newTable(owner_id: user_id, table_id: table_id, environment_name: string, tablename: tablename, description: tabledescription, fields: Array<field>): Table;
  static newTable(owner_id: user_id, table_id: table_id, environment_name: string, tablename: tablename, description: tabledescription, fields: any): Table {
    if (typeof fields === "string")
      fields = JSON.parse(fields);
    return new Table({ owner_id, table_id, environment_name, tablename, description, fields });
  }

  toJSON() {
    return {
      owner_id: this.owner_id,
      table_id: this.table_id,
      environment_name: this.environment_name,
      tablename: this.tablename,
      description: this.description,
      fields: this.fields
    };
  }
}