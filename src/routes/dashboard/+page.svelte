<script>
    import { getCurrSession, logOutUser } from "$lib/auth";
    import { onMount } from "svelte";
    import { appwriteDatabases } from "$lib/index";
    import { Query } from "appwrite";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let isAdmin = false;
    let isRegisterOpen = true;
    let events = [];

    onMount(async () => {

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
        <table class="min-w-full border border-gray-300 text-sm">
            <thead>
                <tr class="bg-gray-100">
                    <th class="border px-2 py-2">Event</th>
                    {#if events.length > 0}
                        {#each events[0].teams as team, teamIdx}
                            <th class="border px-2 py-2">Team</th>
                        {/each}
                    {/if}
                </tr>
            </thead>
            <tbody>
                {#each events as event}
                    <tr>
                        <td class="border px-2 py-2 align-top font-bold whitespace-nowrap">{event.Name}</td>
                        {#each event.teams as team}
                            <td class="border px-2 py-2 align-top">
                                <div class="font-semibold mb-1">ID: {team.TeamID}</div>
                                <div class="flex flex-col gap-1">
                                    {#each team.Members as member}
                                        <div class="bg-green-100 text-green-800 rounded px-2 py-1 w-fit">{member}</div>
                                    {/each}
                                </div>
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            text-align: left;
        }
        @media (max-width: 600px) {
            table, thead, tbody, th, td, tr {
                display: block;
            }
            thead {
                display: none;
            }
            tr {
                margin-bottom: 1.5rem;
                border-bottom: 2px solid #e5e7eb;
            }
            td {
                border: none;
                padding: 0.5rem 0;
            }
            td:before {
                content: attr(data-label);
                font-weight: bold;
                display: block;
                margin-bottom: 0.25rem;
            }
        }
    </style>
</main>
