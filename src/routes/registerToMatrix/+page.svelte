<script lang="ts">
    import { onMount } from "svelte";
    import { logOutUser } from "$lib/auth";
    import { appwriteDatabases, appwriteUser } from "$lib/index";
    import { goto } from "$app/navigation";
    import { Query, ID, Teams } from "appwrite";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let name = "";
    let events = [] as any[];
    
    // Prevent multiple rapid team creations for the same event
    function hasPendingUserTeam(ev: any): boolean {
        return Array.isArray(ev?.teams) && ev.teams.some((t: any) => !t.$id && Array.isArray(t.Members) && t.Members.includes(name));
    }

    onMount(async () => {
        const response = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Events,[Query.select(['*',"teams.*"]), Query.limit(500)]);
        events = response.documents;
        const user = await appwriteUser.get();
        name = user.name || "Unknown User";
    });

    // Derived: which events are selected (max 6)
    $: selectedEvents = (events || []).filter((ev: any) => !!ev.Selected);
    $: maxEventsReached = selectedEvents.length >= 6;
    
    // For each selected event: must have exactly one team Selected, that team must include current user and not exceed max
    function teamReady(ev: any): boolean {
        if (!ev?.teams || ev.teams.length === 0) return false;
        const chosen = ev.teams.filter((t: any) => !!t.Selected);
        if (chosen.length !== 1) return false;
        const t = chosen[0];
        const includesUser = Array.isArray(t.Members) && t.Members.includes(name);
        const underMax = typeof ev.MaxMembersPerTeam === 'number' ? t.Members.length <= ev.MaxMembersPerTeam : true;
        return includesUser && underMax;
    }
    $: canSubmit = selectedEvents.length > 0 && selectedEvents.every((ev: any) => teamReady(ev));

    function createTeam(event:any) {
        // Guard: if there's already a newly created (unsaved) team for this user in this event, do nothing
        if (hasPendingUserTeam(event)) return;
        // Only add locally, don't submit to DB yet
        const newTeam = {
            TeamID: "2043-90" + (event.teams.length + 1),
            Members: [name],
            Selected: true,
            eventID: event.$id
            // No $id yet
        };
        event.teams.forEach((t: any) => t.Selected = false);
        event.teams = [...event.teams, newTeam];
        events = [...events]; // Force Svelte to update UI
    }

    async function submitEvent() {
        for (const event of events) {
            if (event.Selected) {
                // Find the selected team
                const selectedTeam = event.teams.find((team: any) => team.Selected);
                if (selectedTeam) {
                    // If the selected team is new (no $id), create it first
                    if (!selectedTeam.$id) {
                        const createdTeam = await appwriteDatabases.createDocument(
                            DB_ID,
                            COLLECTION.Teams,
                            ID.unique(),
                            {
                                TeamID: selectedTeam.TeamID,
                                Members: selectedTeam.Members,
                                teams: selectedTeam.eventID
                            }
                        );
                        selectedTeam.$id = createdTeam.$id;
                    }
                    // Remove user from all other teams in this event
                    for (const team of event.teams as any[]) {
                        if (team !== selectedTeam && team.Members.includes(name)) {
                            team.Members = (team.Members as string[]).filter((member: string) => member !== name);
                            if (team.$id) {
                                await appwriteDatabases.updateDocument(
                                    DB_ID,
                                    COLLECTION.Teams,
                                    team.$id,
                                    { Members: [...team.Members] }
                                );
                            }
                        }
                    }
                    // Add user to selected team if not already present and not full
                    if (!selectedTeam.Members.includes(name) && selectedTeam.Members.length < event.MaxMembersPerTeam) {
                        selectedTeam.Members.push(name);
                        await appwriteDatabases.updateDocument(
                            DB_ID,
                            COLLECTION.Teams,
                            selectedTeam.$id,
                            { Members: [...selectedTeam.Members] }
                        );
                    }
                }
            }
        }
        goto('/dashboard');
    }

</script>

<main class="min-h-screen">
    <nav class="flex items-center justify-between px-4 py-4 border-b">
        <a class="text-2xl font-semibold tracking-tight" href="/">Matrix</a>
        <div class="flex items-center gap-2">
            <a href="/dashboard">
                <button class="btn bg-[#658BFF] text-white font-bold rounded-lg px-5 py-2">Dashboard</button>
            </a>
            <button
                class="btn bg-[#FF6565] text-white font-bold rounded-lg px-5 py-2"
                on:click={async () => { await logOutUser(); }}
            >Log Out</button>
        </div>
    </nav>

    <section class="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <header class="space-y-1">
            <h1 class="text-2xl font-bold">Register to Matrix</h1>
            <p class="text-sm text-gray-600">Choose your events, then pick your team for each selected event.</p>
        </header>

        <!-- Events selection -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Select your events</h2>
                <span class="text-sm text-gray-500">{selectedEvents.length}/6 selected</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each events as event}
                    <label
                        class={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition shadow-sm ${event.Selected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'} ${!event.Selected && maxEventsReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <input class="sr-only" type="checkbox" bind:checked={event.Selected} disabled={!event.Selected && maxEventsReached} />
                        <span class={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${event.Selected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>✓</span>
                        <span class="flex-1">
                            <span class="block font-semibold leading-tight">{event.Name}</span>
                            <span class="block text-xs text-gray-500">Max {event.MaxMembersPerTeam} per team</span>
                        </span>
                    </label>
                {/each}
            </div>
        </div>

        <!-- Team selection per selected event -->
        <div class="space-y-5">
            <h2 class="text-lg font-semibold">Select your team</h2>
            {#each events as event,i}
                {#if event.Selected}
                    <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <h3 class="font-semibold text-lg">{event.Name}</h3>
                                <p class="text-xs text-gray-500">Max {event.MaxMembersPerTeam} members per team</p>
                            </div>
                            <button
                                class="btn bg-[#658BFF] text-white font-semibold rounded-md px-3 py-1.5 h-9 disabled:opacity-60 disabled:cursor-not-allowed"
                                disabled={hasPendingUserTeam(event)}
                                on:click={() => createTeam(event)}
                            >Create My Team</button>
                        </div>

                        <div class="mt-3 space-y-2">
                            {#each event.teams as team, index}
                                {#key team}
                                <label
                                    class={`flex items-start justify-between gap-3 rounded-lg border p-3 cursor-pointer transition ${team.Members.length >= event.MaxMembersPerTeam ? 'bg-gray-100 border-gray-200 opacity-70' : (team.Selected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300')}`}
                                >
                                    <div class="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            name={`team-${i}`}
                                            value={index}
                                            checked={team.Selected}
                                            role="radio"
                                            aria-checked={team.Selected}
                                            disabled={team.Members.length >= event.MaxMembersPerTeam}
                                            on:change={() => {
                                                (event.teams as any[]).forEach((t: any, idx: number) => t.Selected = idx === index);
                                                event.teams = [...event.teams];
                                            }}
                                        />
                                        <div>
                                            <div class="font-semibold">Team {team.TeamID}</div>
                                            <div class="mt-1 flex flex-wrap gap-1">
                                                {#each team.Members as member}
                                                    <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">{member}</span>
                                                {/each}
                                                {#if team.Members.length === 0}
                                                    <span class="text-xs text-gray-400">No members</span>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                    {#if team.Members.length >= event.MaxMembersPerTeam}
                                        <span class="text-[11px] font-semibold text-red-600">Full</span>
                                    {/if}
                                </label>
                                {/key}
                            {/each}
                        </div>
                    </div>
                {/if}
            {/each}
        </div>

        <!-- Submit -->
        <div class="flex items-center justify-between border-t pt-4">
            <div class="text-xs text-gray-500">
                {#if !canSubmit}
                    Select at least one event, pick exactly one team per selected event, and ensure your name is in that team.
                {:else}
                    You’re all set. Review and submit.
                {/if}
            </div>
            <button
                class="btn bg-[#658BFF] text-white font-bold rounded-lg px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canSubmit}
                on:click={submitEvent}
            >Submit</button>
        </div>
    </section>
</main>
