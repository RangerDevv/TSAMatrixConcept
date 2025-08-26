<script lang="ts">
    import { getCurrSession, logOutUser } from "$lib/auth";
    import { onMount } from "svelte";
    import { appwriteDatabases } from "$lib/index";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let events = [] as any[];

    let isAdmin = false;
    let isRegisterOpen = true;

        onMount(async () => {
        await appwriteDatabases
            .listDocuments(DB_ID, COLLECTION.Events)
            .then((response) => {
                events = response.documents;

                for (let i = 0; i < events.length; i++) {
                    for (let j = 0; j < events[i].Members.length; j++) {
                        events[i].Members[j] = JSON.parse(events[i].Members[j]);
                    }
                }

                console.log("Events fetched:", events);
            });
    });

</script>

<main>
    <nav class="flex flex-row justify-around p-4 gap-3">
        <p class="flex-1 text-xl">TSA Matrix</p>
        <a href="/registerToMatrix">
            <button
                class="btn bg-[#658BFF] p-2 text-white font-bold rounded-lg px-5"
                disabled={!isRegisterOpen}>Register For Event</button
            >
        </a>
        <button
            class="btn bg-[#FF6565] p-2 text-white font-bold rounded-lg px-5"
            on:click={async () => {
                await logOutUser();
            }}>Log Out</button
        >
    </nav>

    <div class="overflow-x-auto mt-8">
        <table class="min-w-full border border-gray-300">
            <thead>
                <tr class="bg-gray-100">
                    <th class="border px-4 py-2">Event Info</th>
                    {#if events.length > 0}
                        {#each events[0].Members as _, teamIdx}
                            <th class="border px-4 py-2">Team {teamIdx + 1}</th>
                        {/each}
                    {/if}
                </tr>
            </thead>
            <tbody>
                {#each events as event}
                    <tr>
                        <td class="border px-4 py-2 align-top">
                            <div class="font-bold text-lg">{event.Name}</div>
                            {#if event.Information && event.Information.length > 0}
                                <div class="text-sm text-gray-700 mt-1">
                                    {#each event.Information as info}
                                        <div>{info}</div>
                                    {/each}
                                </div>
                            {/if}
                        </td>
                        {#each event.Members as team}
                            <td class="border px-4 py-2 align-top">
                                {#if team.length > 0}
                                    <ul>
                                        {#each team as member}
                                            <li class="bg-green-100 text-green-800 rounded px-2 py-1 mb-1">{member}</li>
                                        {/each}
                                    </ul>
                                {:else}
                                    <span class="text-gray-400">No members</span>
                                {/if}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</main>
