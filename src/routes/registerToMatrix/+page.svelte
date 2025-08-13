<script lang="ts">
    import { onMount } from "svelte";
    import { logOutUser } from "$lib/auth";
    import { appwriteDatabases, appwriteUser } from "$lib/index";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let name = "";
    let events = [] as any[];

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

        await appwriteUser.get().then((user) => {
            name = user.name || "Guest";
        }).catch((error) => {
            console.error("Error fetching user data:", error);
        });
    });

    async function handleSubmit() {

        for (let i = 0; i < events.length; i++) {
            for (let j = 0; j < events[i].Members.length; j++) {
                if (events[i].Selected && events[i].teamSelected !== -1) {
                    if (!events[i].Members[j]) {
                        events[i].Members[j] = [];
                    }
                    if (!events[i].Members[events[i].teamSelected].includes(name)) {
                        events[i].Members[events[i].teamSelected].push(name);
                    }
                }
            }
        }
        for (let i = 0; i < events.length; i++) {
            for (let j = 0; j < events[i].Members.length; j++) {
                if (typeof events[i].Members[j] !== 'string') {
                    events[i].Members[j] = JSON.stringify(events[i].Members[j]);
                }
            }
        }

        for (let i = 0; i < events.length; i++) {
            if (events[i].Selected && events[i].teamSelected !== -1) {
                appwriteDatabases.updateDocument(
                    DB_ID,
                    COLLECTION.Events,
                    events[i].$id,
                    {
                        Members: events[i].Members
                    }
                );
            }
        }
    }
</script>

<main>
    <nav class="flex flex-row justify-around p-4 gap-3">
        <p class="flex-1 text-2xl pt-2">Matrix</p>
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
    <div class="flex flex-col p-4 text-lg gap-y-3">
        <p class="text-xl">Select Your Events:</p>
        {#each events as event}
            <label>
                <input type="checkbox" bind:checked={event.Selected} />
                {event.Name}
            </label>
        {/each}

        <p class="text-xl">Select Your Team:</p>
        {#each events as event,i}
            {#if event.Selected}
                <div class="border p-3 my-2 rounded-lg bg-gray-50">
                    <h3 class="font-bold text-lg mb-2">Event: {event.Name}</h3>
                    {#each event.Members as team, index}
                        <div class="mb-2">
                            <label class="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name={`team-${i}`}
                                    value={index}
                                    bind:group={event.teamSelected}
                                />
                                <span class="font-semibold">Team {index + 1}:</span>
                                <span>
                                    {#each team as member, mIdx}
                                        <span class="px-1 py-0.5 rounded bg-green-100 text-green-800 mx-1">
                                            {member}
                                        </span>
                                    {/each}
                                </span>
                            </label>
                        </div>
                    {/each}
                    <button
                        class="btn bg-[#658BFF] text-white font-bold rounded-lg px-4 py-1 mb-3"
                        on:click={() => {
                            event.Members = [...event.Members, []];
                            event.teamSelected = event.Members.length - 1;
                        }}
                    >Create My Team</button>
                </div>
            {/if}
        {/each}

        <button
            class="btn bg-[#658BFF] p-2 text-white font-bold rounded-lg px-5"
            on:click={handleSubmit}
            >Submit</button>
    </div>
</main>
