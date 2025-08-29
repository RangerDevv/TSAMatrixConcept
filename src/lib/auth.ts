import { DB_ID, COLLECTION } from "./ids";
import { appwriteDatabases, appwriteUser } from "$lib";
import { ID } from "appwrite";
import { goto } from "$app/navigation";

const userId = await ID.unique();

export async function createUser(
  email: string,
  name: string,
  password: string,
) {
  const user = await appwriteUser
    .create(userId, email, password, name)
    .then((res: any) => {
      logInUser(email, password, name);
    })
    .catch((error: any) => {
      console.error(error);
      logInUser(email, password, name);
    });
}

export async function logInUser(email: string, password: string, name: string) {
  const user = await appwriteUser
    .createEmailPasswordSession(email, password)
    .then((res: any) => {
      appwriteDatabases.createDocument(
        DB_ID,
        COLLECTION.Students,
        userId,
        { Name: name }
      ).then(() => {
        goto("/dashboard");
      });
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export async function logOutUser(): Promise<void> {
  await appwriteUser.deleteSession("current").then(() => {
    goto("/");
  });
}

export async function getCurrSession() {
  return (await appwriteUser.getSession("current")).userId;
}
