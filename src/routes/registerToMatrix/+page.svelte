<script lang="ts">
    import { onMount } from "svelte";
    import { logOutUser } from "$lib/auth";
    import { appwriteDatabases, appwriteUser } from "$lib/index";
    import { Query, ID, Teams } from "appwrite";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let name = "";
    let events = [] as any[];
    
    // Prevent multiple rapid team creations for the same event
    function hasPendingUserTeam(ev: any): boolean {
        return Array.isArray(ev?.teams) && ev.teams.some((t: any) => !t.$id && Array.isArray(t.Members) && t.Members.includes(name));
    }

    onMount(async () => {
        const response = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Events,[Query.select(['*',"teams.*"])]);
        events = response.documents;
        const user = await appwriteUser.get();
        name = user.name || "Unknown User";
    });

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
                    <h3 class="font-bold text-lg mb-1">Event: {event.Name}</h3>
                    <p class="mb-2 text-sm">Max {event.MaxMembersPerTeam} members per team</p>
                    {#each event.teams as team, index}
                        <div class="mb-2">
                            <label class="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name={`team-${i}`}
                                    value={index}
                                    checked={team.Selected}
                                    disabled={team.Members.length >= event.MaxMembersPerTeam}
                                    on:change={() => {
                                        (event.teams as any[]).forEach((t: any, idx: number) => t.Selected = idx === index);
                                        event.teams = [...event.teams];
                                    }}
                                />
                                <span class="font-semibold">Team {team.TeamID}:</span>
                                <span>
                                    {#each team.Members as member, mIdx}
                                        <span class="px-1 py-0.5 rounded bg-green-100 text-green-800 mx-1">
                                            {member}
                                        </span>
                                    {/each}
                                </span>
                            </label>
                        </div>
                    {/each}
                    <button
                        class="btn bg-[#658BFF] text-white font-bold rounded-lg px-4 py-1 mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={hasPendingUserTeam(event)}
                        on:click={() => createTeam(event)}
                    >Create My Team</button>
                </div>
            {/if}
        {/each}
        <div>
            <button
                class="btn bg-[#658BFF] p-2 text-white font-bold rounded-lg px-5"
                on:click={submitEvent}
            >Submit</button>
        </div>
    </div>
</main>
