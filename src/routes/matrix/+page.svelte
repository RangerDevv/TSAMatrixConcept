<script lang="ts">
    import { onMount } from "svelte";
    import { appwriteDatabases } from "$lib/index";
    import { Query } from "appwrite";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let events: any[] = [];

    onMount(async () => {
        const response = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Events, [Query.select(['*', 'teams.*'])]);
        events = response.documents;
    });
</script>

<main>
    <nav class="flex flex-row justify-around p-4 gap-3">
        <p class="flex-1 text-xl">TSA Matrix</p>
        <a href="/registerToMatrix">
            <button
                class="btn bg-[#658BFF] p-2 text-white font-bold rounded-lg px-5"
            >Register For Event</button>
        </a>
    </nav>
    <div class="mt-8 md:mx-16 md:rounded-xl md:shadow-lg md:bg-white outline">
        <!-- Desktop Table -->
        <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full border border-gray-300 text-sm rounded-xl overflow-hidden">
                <tbody>
                    {#each events as event}
                        <tr class="bg-gray-50">
                            <td class="border px-4 py-2 align-top font-bold whitespace-nowrap" style="min-width: 120px;">
                                {event.Name}
                            </td>
                            {#each event.teams as team}
                                <td class="border px-4 py-2 align-top" style="min-width: 160px;">
                                    <div class="font-semibold mb-1">Team ID: {team.TeamID}</div>
                                    <div class="flex flex-col gap-1">
                                        {#if team.Members.length > 0}
                                            {#each team.Members as member}
                                                <div class="member-pill">{member}</div>
                                            {/each}
                                        {:else}
                                            <span class="text-gray-400">No members</span>
                                        {/if}
                                    </div>
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <!-- Mobile Columns Layout -->
        <div class="md:hidden flex flex-col gap-6 mx-2">
            {#each events as event}
                <div class="border rounded-xl shadow p-3 bg-white">
                    <div class="font-bold text-lg mb-2">{event.Name}</div>
                    <div class="grid grid-cols-1 gap-4">
                        {#each event.teams as team}
                            <div class="border rounded-lg p-2 bg-gray-50">
                                <div class="font-semibold mb-1">Team {team.TeamID}</div>
                                <div class="flex flex-wrap gap-1">
                                    {#if team.Members.length > 0}
                                        {#each team.Members as member}
                                            <div class="member-pill">{member}</div>
                                        {/each}
                                    {:else}
                                        <span class="text-gray-400">No members</span>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</main>
<style>
    table {
        border-radius: 0.75rem;
        overflow: hidden;
        margin-left: auto;
        margin-right: auto;
    }
    th, td {
        text-align: left;
    }
    .member-pill {
        background-color: #bbf7d0;
        color: #166534;
        border-radius: 0.5rem;
        padding: 0.25rem 0.75rem;
        font-weight: 500;
        display: inline-block;
        transition: background 0.2s;
        cursor: pointer;
    }
    .member-pill:hover {
        background-color: #86efac;
    }
    td {
        transition: background 0.2s;
    }
    td:hover {
        background-color: #f3f4f6;
    }
    @media (max-width: 768px) {
        .md\:mx-16 { margin-left: 0.5rem; margin-right: 0.5rem; }
        td { font-size: 0.95rem; }
    }
    @media (min-width: 769px) {
        .md\:mx-16 { margin-left: 4rem; margin-right: 4rem; }
    }
</style>
