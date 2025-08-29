<script lang="ts">
    import { onMount } from "svelte";
    import { appwriteDatabases } from "$lib/index";
    import { Query } from "appwrite";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let events: any[] = [];
    let users: any[] = [];

    let showSidebar = false;
    let editingEvent: any = null;
    let editingTeam: any = null;
    let draftMembers: string[] = [];
    let draftTeamID = "";
    let newMember = "";
    let saving = false;
    let errorMsg = "";
    let successMsg = "";

    onMount(async () => {
        const response = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Events, [Query.select(['*', 'teams.*'])]);
        events = response.documents;
        const userResponse = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Students, [Query.select(['*'])]);
        users = userResponse.documents;
    });

    function openSidebar(event: any, team: any) {
        editingEvent = event;
        editingTeam = team;
        draftMembers = [...team.Members];
        draftTeamID = team.TeamID;
        newMember = "";
        errorMsg = "";
        successMsg = "";
        showSidebar = true;
    }

    function closeSidebar() {
        showSidebar = false;
        editingEvent = null;
        editingTeam = null;
        draftMembers = [];
        draftTeamID = "";
        newMember = "";
        saving = false;
    }

    function addMember() {
        const m = newMember.trim();
        if (!m) return;
        if (!draftMembers.includes(m)) draftMembers = [...draftMembers, m];
        newMember = "";
    }

    function removeMember(member: string) {
        draftMembers = draftMembers.filter(m => m !== member);
    }

    async function saveTeam() {
        if (!editingTeam) return;
        saving = true;
        errorMsg = "";
        successMsg = "";
        try {
            // Update local
            editingTeam.TeamID = draftTeamID;
            editingTeam.Members = [...draftMembers];
            // Persist to DB if team has an id
            if (editingTeam.$id) {
                await appwriteDatabases.updateDocument(
                    DB_ID,
                    COLLECTION.Teams,
                    editingTeam.$id,
                    { TeamID: editingTeam.TeamID, Members: editingTeam.Members }
                );
                successMsg = "Team updated";
            } else {
                errorMsg = "Team has no ID yet (probably not created).";
            }
            // Force reactive update
            events = [...events];
        } catch (e: any) {
            errorMsg = e.message || 'Failed to update team';
        } finally {
            saving = false;
        }
    }

    async function deleteTeam() {
        if (!editingTeam) return;
        saving = true;
        errorMsg = "";
        successMsg = "";
        try {
            const teamId = editingTeam.$id;
            // Remove locally first
            editingEvent.teams = editingEvent.teams.filter((t: any) => t !== editingTeam);
            events = [...events];
            if (teamId) {
                await appwriteDatabases.deleteDocument(DB_ID, COLLECTION.Teams, teamId);
            }
            closeSidebar();
        } catch (e: any) {
            errorMsg = e.message || 'Failed to delete team';
            saving = false;
        }
    }
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
                                    <div class="flex flex-col gap-1 mb-2">
                                        {#if team.Members.length > 0}
                                            {#each team.Members as member}
                                                <div class="member-pill">{member}</div>
                                            {/each}
                                        {:else}
                                            <span class="text-gray-400">No members</span>
                                        {/if}
                                    </div>
                                    <button class="btn bg-[#FBBF24] text-black font-bold rounded-lg px-3 py-1 bottom-0 " on:click={() => openSidebar(event, team)}>Edit</button>
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
                                <div class="flex flex-wrap gap-1 mb-2">
                                    {#if team.Members.length > 0}
                                        {#each team.Members as member}
                                            <div class="member-pill">{member}</div>
                                        {/each}
                                    {:else}
                                        <span class="text-gray-400">No members</span>
                                    {/if}
                                </div>
                                <button class="btn bg-[#FBBF24] text-black font-bold rounded-lg px-3 py-1" on:click={() => openSidebar(event, team)}>Edit</button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
        {#if showSidebar}
            <div class="fixed inset-0 bg-black/40 z-40" on:click={closeSidebar}></div>
            <aside class="fixed top-0 right-0 h-full w-96 max-w-full bg-white shadow-xl z-50 flex flex-col">
                <div class="p-5 border-b flex items-center justify-between">
                    <h2 class="text-xl font-bold">Edit Team</h2>
                    <button class="text-gray-500 hover:text-black" on:click={closeSidebar}>✕</button>
                </div>
                <div class="p-5 flex-1 overflow-y-auto space-y-6">
                    <div>
                        <label class="block text-sm font-semibold mb-1">Team ID</label>
                        <input class="border rounded w-full px-3 py-2" bind:value={draftTeamID} />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Members</label>
                        <div class="flex flex-wrap gap-2 mb-3">
                            {#each draftMembers as member}
                                <span class="px-2 py-1 rounded bg-green-100 text-green-800 flex items-center gap-1">
                                    {member}
                                    <button class="text-red-500 hover:text-red-700" on:click={() => removeMember(member)} title="Remove">&times;</button>
                                </span>
                            {/each}
                            {#if draftMembers.length === 0}
                                <span class="text-gray-400 text-sm">No members</span>
                            {/if}
                        </div>
                        <div class="flex gap-2">
                            <select class="border rounded px-3 py-2 flex-1" bind:value={newMember}>
                                <option value="" disabled selected>Select user to add</option>
                                {#each users as user}
                                    {#if !draftMembers.includes(user.Name)}
                                        <option value={user.Name}>{user.Name}</option>
                                    {/if}
                                {/each}
                            </select>
                            <button class="btn bg-[#34D399] text-white font-bold rounded-lg px-4" on:click={addMember}>Add</button>
                        </div>
                    </div>
                    {#if errorMsg}
                        <div class="text-red-600 text-sm">{errorMsg}</div>
                    {/if}
                    {#if successMsg}
                        <div class="text-green-600 text-sm">{successMsg}</div>
                    {/if}
                </div>
                <div class="p-5 border-t flex gap-3">
                    <button class="btn bg-[#FF6565] text-white font-bold rounded-lg px-4 py-2" on:click={deleteTeam} disabled={saving}>Delete</button>
                    <button class="btn bg-[#658BFF] text-white font-bold rounded-lg px-4 py-2" on:click={saveTeam} disabled={saving}>Save</button>
                    <button class="btn bg-gray-300 text-black font-bold rounded-lg px-4 py-2 ml-auto" on:click={closeSidebar}>Close</button>
                </div>
            </aside>
        {/if}
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
    aside { transition: transform .25s ease; }
    /* Pretty edit button styles */
    .edit-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: 600;
        padding: 0.45rem 0.85rem 0.45rem 0.75rem;
        border-radius: 0.55rem;
        background: linear-gradient(90deg,#fcd34d,#fbbf24 55%,#f59e0b);
        color: #783a00;
        box-shadow: 0 2px 4px rgba(0,0,0,.08), 0 0 0 1px rgba(251,191,36,.3);
        transition: background .25s, box-shadow .25s, transform .15s;
    }
    .edit-btn:hover {
        background: linear-gradient(90deg,#fde68a,#fcd34d 60%,#fbbf24);
        box-shadow: 0 4px 10px rgba(0,0,0,.12), 0 0 0 2px rgba(251,191,36,.45);
    }
    .edit-btn:active { transform: translateY(1px); }
    .edit-btn:focus-visible { outline: 2px solid #fbbf24; outline-offset: 2px; }
    .edit-btn svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 1.8; fill: none; }
    .edit-btn .shine {
        position:absolute; inset:0; border-radius:inherit; pointer-events:none;
        background: radial-gradient(circle at 30% 20%,rgba(255,255,255,.55),transparent 60%);
        mix-blend-mode: overlay; opacity:.65; transition: opacity .3s;
    }
    .edit-btn:hover .shine { opacity: .85; }
</style>
