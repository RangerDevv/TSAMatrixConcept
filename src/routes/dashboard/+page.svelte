<script lang="ts">
    import { getCurrSession, logOutUser } from "$lib/auth";
    import { onMount } from "svelte";
    import { appwriteDatabases, appwriteUser } from "$lib/index";
    import { Query } from "appwrite";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let isAdmin = false;
    let isRegisterOpen = true;
    let name = "";
    let events = [] as any[];

    onMount(async () => {
        const user = await appwriteUser.get();
        name = user.name || "Unknown User";
        console.log("User name:", name);

        await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Teams, [Query.equal("Members", [name])]).then((response) => {
            console.log("Teams response:", response.documents);
            events = response.documents;
        });
    });
</script>

<main>
    <nav class="flex flex-row justify-around p-4 gap-3">
        <p class="flex-1 text-xl">TSA Matrix</p>
        <a href="/matrix">
            <button
                class="btn bg-[#658BFF] p-2 text-white font-bold rounded-lg px-5">Matrix</button>
        </a>
        <button
            class="btn bg-[#FF6565] p-2 text-white font-bold rounded-lg px-5"
            on:click={async () => {
                await logOutUser();
            }}>Log Out</button
        >
    </nav>

    <!-- greeting -->
    <p class="text-left text-3xl p-4">Hello, {name}!</p>

    <h1 class="text-2xl font-bold text-center mt-6">Your Events and Teams</h1>

        <div class="flex flex-wrap gap-3">
            {#each events as event}
                <div class="border border-gray-300 rounded-lg p-4 m-4 w-64 bg-white outline shadow-lg">
                    <h3 class="text-xl font-bold">{event.teams.Name}</h3>
                    <h3 class="text-lg">{event.TeamID}</h3>
                    <h3 class="text-lg">{event.Information}</h3>
                    <p class="text-sm">Members: {event.Members.join(", ")}</p>
                </div>
            {/each}
        </div>
</main>
