<script>
    import { onMount } from "svelte";
    import { logOutUser } from "$lib/auth";
    import { appwriteDatabases } from "$lib/index";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let events = [];
    let selectedEvents = [];

    onMount(async () => {
        await appwriteDatabases
            .listDocuments(DB_ID, COLLECTION.Events)
            .then((response) => {
                events = response.documents;
            });
    });
</script>

<main>
    <nav class="flex flex-row justify-around p-4 gap-3">
        <p class="flex-1 text-2xl">TSA Matrix</p>
        <a href="/dashboard">
            <button
                class="btn bg-[#658BFF] p-2 text-white font-bold rounded-lg px-5"
                >Dashboard</button
            >
        </a>
        <button
            class="btn bg-[#FF6565] p-2 text-white font-bold rounded-lg px-5"
            on:click={async () => {
                await logOutUser();
            }}>Log Out</button
        >
    </nav>
    <div class="flex flex-col p-4 text-lg px-40 gap-y-3">
        <p class="text-xl">Select Your Events:</p>
        {#each events as event}
            <label>
                <input type="checkbox" bind:checked={event.Selected} />
                {event.Name}
            </label>
        {/each}

        <p class="text-xl">Select Your Team:</p>
        {#each events as event}
            {#if event.Selected}
                {#each event.Members as team}
                    <label>
                        <input type="checkbox" />
                        Team Members: {team}
                    </label>
                {/each}
            {/if}
        {/each}
    </div>
</main>
