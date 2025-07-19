import {
  Client,
  Account,
  ID,
  Databases,
  Permission,
  Role,
  Teams,
  Storage,
} from "appwrite";

export const client = new Client();

const appwriteClient = client
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("687970000022421d1877"); // Replace with your project ID

export const appwriteDatabases = new Databases(appwriteClient);
export const appwriteStorage = new Storage(appwriteClient);
export const appwriteUser = new Account(appwriteClient);
export const appwriteTeams = new Teams(appwriteClient);
