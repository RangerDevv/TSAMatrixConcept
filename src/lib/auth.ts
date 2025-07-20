import { DB_ID, COLLECTION } from "./ids";
import { appwriteUser } from "$lib";
import { ID } from "appwrite";
import { goto } from "$app/navigation";

export async function createUser(
  email: string,
  name: string,
  password: string,
) {
  const user = await appwriteUser
    .create(ID.unique(), email, password, name)
    .then((res: any) => {
      logInUser(email, password);
      goto("/dashboard");
    })
    .catch((error: any) => {
      console.error(error);
      logInUser(email, password);
    });
}

export async function logInUser(email: string, password: string) {
  const user = await appwriteUser
    .createEmailPasswordSession(email, password)
    .then((res: any) => {
      goto("/dashboard");
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
