<script lang="ts">
    import { onMount } from "svelte";
    import { appwriteDatabases, appwriteUser } from "$lib/index";
    import { Query } from "appwrite";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let events: any[] = [];
    let users: any[] = [];
    let isAdmin = false;

    let showSidebar = false;
    let sidebarMode: 'team' | 'event' = 'team';
    let editingEvent: any = null;
    let editingTeam: any = null;
    let draftMembers: string[] = [];
    let draftTeamID = "";
    let newMember = "";
    let saving = false;
    let errorMsg = "";
    let successMsg = "";

    // Event draft fields
    let draftEventName = '';
    let draftEventInfo = '';
    let draftEventMax = 4;
    let creatingNewEvent = false;
    let draftEventFlags: string[] = [];
    let draftEventStateMax: number = 0; // New field for state max

    // Event flag definitions (keys kept short; tokens embedded into Information field as [FLG:key])
    const EVENT_FLAGS = [
        { key: 'OPEN_SLOTS', label: 'Open event slots', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        { key: 'PA_ONLY', label: 'PA ONLY event', color: 'bg-red-100 text-red-700 border-red-300' },
        { key: 'NATL_AT_STATES', label: 'Natl event offered at states', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
        { key: 'EXTRA_COMP', label: 'Extra competitors (in-house required)', color: 'bg-amber-100 text-amber-700 border-amber-300' },
        { key: 'IN_PERSON', label: 'In-Person', color: 'bg-blue-100 text-blue-700 border-blue-300' },
        { key: 'EARLY_SUB_REG', label: 'Early Submission (Regional)', color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300' },
        { key: 'POST_CONF', label: 'Post Conference', color: 'bg-slate-100 text-slate-700 border-slate-300' },
        { key: 'TEAM', label: 'T = team', color: 'bg-teal-100 text-teal-700 border-teal-300' },
        { key: 'STATE_MAX', label: 'SM = state max', color: 'bg-orange-100 text-orange-700 border-orange-300' },
        { key: 'REGIONAL_REQ', label: 'R = must be at regional conf', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
        { key: 'STATE_QUAL', label: 'Q = state qualifier', color: 'bg-pink-100 text-pink-700 border-pink-300' },
        { key: 'NEW_EVENT', label: 'New Event', color: 'bg-lime-100 text-lime-700 border-lime-300' },
        { key: 'EARLY_SUB_PA', label: 'Early Submission (PA)', color: 'bg-purple-100 text-purple-700 border-purple-300' }
    ];

    const FLAG_TOKEN_PREFIX = '[FLG:'; // stored inside Information
    const FLAG_MAP: Record<string, { key: string; label: string; color: string }> = Object.fromEntries(EVENT_FLAGS.map(f => [f.key, f]));

    // Filtering state
    let activeFlagFilters: string[] = [];

    // Derived filtered events (events must include ALL active filters)
    $: filteredEvents = activeFlagFilters.length === 0
        ? events
        : events.filter(ev => {
            if (!ev._flags || ev._flags.length === 0) return false;
            return activeFlagFilters.every(f => ev._flags.includes(f));
        });

    function toggleFilterFlag(key: string) {
        if (activeFlagFilters.includes(key)) {
            activeFlagFilters = activeFlagFilters.filter(k => k !== key);
        } else {
            activeFlagFilters = [...activeFlagFilters, key];
        }
    }

    function clearFilters() { activeFlagFilters = []; }

    function extractFlags(info: string | null | undefined): { base: string; flags: string[] } {
        if (!info) return { base: '', flags: [] };
        const flagPattern = /\[FLG:([A-Z0-9_\-]+)\]/g;
        const flags: string[] = [];
        const base = info.replace(flagPattern, (_m, key) => { flags.push(key); return ''; }).trim();
        return { base: base.replace(/\n{2,}/g, '\n'), flags: Array.from(new Set(flags)) };
    }

    function composeInfo(base: string, flags: string[]): string {
        const clean = base.trim();
        const tokens = flags.map(f => `${FLAG_TOKEN_PREFIX}${f}]`).join(' ');
        return tokens.length ? `${clean}\n\n${tokens}` : clean;
    }

    // Removed original basic onMount; replaced below with flag parsing version.

    function openSidebar(event: any, team: any) {
        if (!isAdmin) return;
        sidebarMode = 'team';
        editingEvent = event;
        editingTeam = team;
        draftMembers = [...team.Members];
        draftTeamID = team.TeamID;
        newMember = "";
        errorMsg = "";
        successMsg = "";
        showSidebar = true;
    }

    function openCreateEvent() {
        if (!isAdmin) return;
        sidebarMode = 'event';
        creatingNewEvent = true;
        editingEvent = null;
        draftEventName = '';
        draftEventInfo = '';
        draftEventMax = 4;
        draftEventFlags = [];
        draftEventStateMax = 0;
        errorMsg = '';
        successMsg = '';
        showSidebar = true;
    }

    function openEditEvent(ev: any) {
        if (!isAdmin) return;
        sidebarMode = 'event';
        creatingNewEvent = false;
        editingEvent = ev;
        draftEventName = ev.Name || '';
        const parsed = extractFlags(ev.Information);
        draftEventInfo = parsed.base || '';
        draftEventFlags = [...parsed.flags];
        draftEventMax = ev.MaxMembersPerTeam || 4;
        draftEventStateMax = ev.StateMax ?? 0;
        errorMsg = '';
        successMsg = '';
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
        creatingNewEvent = false;
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

    async function saveEvent() {
        if (draftEventName.trim().length === 0) { errorMsg = 'Event name required'; return; }
        if (draftEventMax < 1) { errorMsg = 'Max members must be at least 1'; return; }
        saving = true; errorMsg=''; successMsg='';
        try {
            if (!creatingNewEvent && editingEvent) {
                editingEvent.Name = draftEventName.trim();
                const fullInfo = composeInfo(draftEventInfo, draftEventFlags);
                editingEvent.Information = fullInfo;
                editingEvent.MaxMembersPerTeam = draftEventMax;
                editingEvent.StateMax = draftEventStateMax;
                // Update parsed helpers
                const parsed = extractFlags(fullInfo);
                editingEvent._baseInfo = parsed.base;
                editingEvent._flags = parsed.flags;
                await appwriteDatabases.updateDocument(
                    DB_ID,
                    COLLECTION.Events,
                    editingEvent.$id,
                    { Name: editingEvent.Name, Information: editingEvent.Information, MaxMembersPerTeam: editingEvent.MaxMembersPerTeam, StateMax: editingEvent.StateMax }
                );
                successMsg = 'Event updated';
                events = [...events];
            } // creation handled by createEventFinalize()
        } catch (e:any) {
            errorMsg = e.message || 'Failed to save event';
        } finally { saving = false; }
    }

    async function createEventFinalize() {
        // Separate function to correctly use ID.unique()
        saving = true; errorMsg=''; successMsg='';
        try {
            const fullInfo = composeInfo(draftEventInfo, draftEventFlags);
            const app = await appwriteDatabases.createDocument(
                DB_ID,
                COLLECTION.Events,
                // @ts-ignore - runtime unique id
                (await import('appwrite')).ID.unique(),
                { Name: draftEventName.trim(), Information: fullInfo, MaxMembersPerTeam: draftEventMax, StateMax: draftEventStateMax }
            );
            app.teams = [];
            const parsed = extractFlags(fullInfo);
            app._baseInfo = parsed.base; app._flags = parsed.flags;
            app.StateMax = draftEventStateMax;
            events = [...events, app];
            successMsg = 'Event created';
            creatingNewEvent = false;
            editingEvent = app;
        } catch (e:any) {
            errorMsg = e.message || 'Failed to create event';
        } finally { saving = false; }
    }

    async function deleteEvent() {
        if (!editingEvent) return;
        saving = true; errorMsg=''; successMsg='';
        try {
            const id = editingEvent.$id;
            events = events.filter(e => e !== editingEvent);
            await appwriteDatabases.deleteDocument(DB_ID, COLLECTION.Events, id);
            closeSidebar();
        } catch (e:any) {
            errorMsg = e.message || 'Failed to delete event';
            saving = false;
        }
    }

    function toggleFlag(key: string, checked: boolean) {
        if (checked) {
            if (!draftEventFlags.includes(key)) draftEventFlags = [...draftEventFlags, key];
        } else {
            draftEventFlags = draftEventFlags.filter(f => f !== key);
        }
    }

    function onOverlayKey(e: KeyboardEvent) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') closeSidebar();
    }

    onMount(async () => {

        appwriteUser.get().then(response => {
            if (response.labels[0] === 'admin') {
                isAdmin = true;
                console.log("Admin user detected");
            }
        });

        const response = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Events, [Query.select(['*', 'teams.*']), Query.limit(1000)]);
        events = response.documents.map(ev => {
            const parsed = extractFlags(ev.Information);
            ev._baseInfo = parsed.base;
            ev._flags = parsed.flags;
            
            // Auto-add EXTRA_COMP flag if teams exceed StateMax, remove if within limit
            if (ev.StateMax > 0 && ev.teams) {
                const teamsExceedMax = ev.teams.length > ev.StateMax;
                const hasExtraComp = ev._flags.includes('EXTRA_COMP');
                
                if (teamsExceedMax && !hasExtraComp) {
                    // Add EXTRA_COMP flag
                    ev._flags = [...ev._flags, 'EXTRA_COMP'];
                    const updatedInfo = composeInfo(ev._baseInfo, ev._flags);
                    ev.Information = updatedInfo;
                    appwriteDatabases.updateDocument(
                        DB_ID,
                        COLLECTION.Events,
                        ev.$id,
                        { Information: updatedInfo }
                    ).catch(err => console.error('Failed to auto-add EXTRA_COMP flag:', err));
                } else if (!teamsExceedMax && hasExtraComp) {
                    // Remove EXTRA_COMP flag
                    ev._flags = ev._flags.filter((flag: string) => flag !== 'EXTRA_COMP');
                    const updatedInfo = composeInfo(ev._baseInfo, ev._flags);
                    ev.Information = updatedInfo;
                    appwriteDatabases.updateDocument(
                        DB_ID,
                        COLLECTION.Events,
                        ev.$id,
                        { Information: updatedInfo }
                    ).catch(err => console.error('Failed to auto-remove EXTRA_COMP flag:', err));
                }
            }
            
            return ev;
        });
        const userResponse = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Students, [Query.select(['*']), Query.limit(10000)]);
        users = userResponse.documents;
    });
</script>

<main>
    <nav class="flex flex-row justify-around p-4 gap-3">
        <a class="flex-1 text-xl" href="/dashboard">TSA Matrix</a>
        <a href="/registerToMatrix">
            <button
                class="btn bg-[#658BFF] p-2 text-white font-bold rounded-lg px-5"
            >Register For Event</button>
        </a>
    </nav>
    <div class="mt-8 md:mx-16 md:rounded-xl md:shadow-lg md:bg-white outline">
        <div class="px-4 py-3 border-b bg-gray-50 rounded-t-xl space-y-4">
            <div class="flex justify-between items-center">
                <h2 class="font-semibold">Events Matrix</h2>
                <div class="flex gap-2">
                    {#if isAdmin}
                        <button class="btn bg-[#658BFF] text-white font-bold rounded-lg px-4 py-2" on:click={openCreateEvent}>+ New Event</button>
                    {/if}
                </div>
            </div>
            <!-- Flag Filters -->
            <div class="filter-bar rounded-lg border bg-white/80 backdrop-blur px-3 py-3 flex flex-col gap-3 shadow-sm">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <span class="inline-flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" class="text-blue-500"><path fill="currentColor" d="M3 4h18v2l-7 8v4l-4 2v-6L3 6z"/></svg> Filter by Flags</span>
                        {#if activeFlagFilters.length > 0}
                            <span class="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{activeFlagFilters.length} selected</span>
                        {/if}
                    </div>
                    <div class="text-xs text-gray-500 font-medium">{filteredEvents.length} result{filteredEvents.length === 1 ? '' : 's'}</div>
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each EVENT_FLAGS as f}
                        <button
                            class="flag-chip {activeFlagFilters.includes(f.key) ? 'active' : ''}"
                            type="button"
                            aria-pressed={activeFlagFilters.includes(f.key)}
                            on:click={() => toggleFilterFlag(f.key)}
                        >
                            <span class="dot" style="--dot-color: var(--c, currentColor);"></span>
                            <span class="label-text">{f.label}</span>
                            {#if activeFlagFilters.includes(f.key)}
                                <span class="check">✓</span>
                            {/if}
                        </button>
                    {/each}
                </div>
                {#if activeFlagFilters.length > 0}
                    <div class="flex gap-3 items-center">
                        <button class="text-xs font-semibold text-blue-600 hover:text-blue-700 underline" type="button" on:click={clearFilters}>Clear Filters</button>
                    </div>
                {/if}
            </div>
        </div>
        <!-- Desktop Table -->
        <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full border border-gray-300 text-md rounded-xl overflow-hidden">
                <tbody>
                    {#each filteredEvents as event}
                        <tr class="bg-gray-50 {event.StateMax > 0 && event.teams && event.teams.length > event.StateMax ? 'bg-red-200' : ''}">
                            <td class="border px-4 py-2 align-top font-bold whitespace-nowrap w-40">
                                <div class="flex flex-col gap-1 text-sm">
                                    <span>{event.Name}</span>
                                    {#if event._baseInfo}
                                        <span class="text-[11px] text-gray-600 max-w-[160px] line-clamp-3 whitespace-pre-line">{event._baseInfo}</span>
                                    {/if}
                                    {#if event._flags && event._flags.length > 0}
                                        <div class="flex flex-wrap gap-1 mt-1 text-sm">
                                            {#each event._flags as fk}
                                                {#if FLAG_MAP[fk]}
                                                    <span class="flag-badge {FLAG_MAP[fk].color}">{FLAG_MAP[fk].label}</span>
                                                {:else}
                                                    <span class="flag-badge bg-gray-100 text-gray-600 border-gray-300">{fk}</span>
                                                {/if}
                                            {/each}
                                        </div>
                                    {/if}
                                    <span class="text-sm bg-blue-100 text-blue-700 px-1 rounded w-max">Max Members Per Team: {event.MaxMembersPerTeam}</span>
                                    {#if event.StateMax > 0}
                                        <span class="text-sm bg-orange-100 text-orange-700 px-1 rounded w-max">State Max: {event.StateMax}</span>
                                    {/if}
                                </div>
                                {#if isAdmin}
                                    <button class="w-full p-1 outline text-sm rounded-md mt-4" on:click={() => openEditEvent(event)}>Edit Event</button>
                                {/if}
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
                                    {#if isAdmin}
                                        <button class="btn bg-[#FBBF24] text-black font-bold rounded-lg px-3 py-1 bottom-0 " on:click={() => openSidebar(event, team)}>Edit</button>
                                    {/if}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <!-- Mobile Columns Layout -->
        <div class="md:hidden flex flex-col gap-6 mx-2">
            {#each filteredEvents as event}
                <div class="border rounded-t-none w-full rounded-xl shadow p-3 bg-white {event.StateMax > 0 && event.teams && event.teams.length > event.StateMax ? 'bg-red-50 border-red-200' : ''}">
                    <div class="font-bold text-lg mb-2">{event.Name}</div>
                    {#if event._baseInfo}
                        <div class="text-xs text-gray-600 whitespace-pre-line mb-2">{event._baseInfo}</div>
                    {/if}
                    {#if event._flags && event._flags.length > 0}
                        <div class="flex flex-wrap gap-1 mb-2">
                            {#each event._flags as fk}
                                {#if FLAG_MAP[fk]}
                                    <span class="flag-badge {FLAG_MAP[fk].color}">{FLAG_MAP[fk].label}</span>
                                {:else}
                                    <span class="flag-badge bg-gray-100 text-gray-600 border-gray-300">{fk}</span>
                                {/if}
                            {/each}
                        </div>
                    {/if}
                    <div class="flex flex-wrap gap-1 mb-3">
                        <span class="text-[0.65rem] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Max/Team: {event.MaxMembersPerTeam}</span>
                        {#if event.StateMax > 0}
                            <span class="text-[0.65rem] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">State Max: {event.StateMax}</span>
                        {/if}
                    </div>
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
                                {#if isAdmin}
                                    <button class="btn bg-[#FBBF24] text-black font-bold rounded-lg px-3 py-1" on:click={() => openSidebar(event, team)}>Edit</button>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
        {#if showSidebar}
            <div class="fixed inset-0 bg-black/40 z-40" role="button" tabindex="0" aria-label="Close sidebar" on:click={closeSidebar} on:keydown={onOverlayKey}></div>
            <aside class="fixed top-0 right-0 h-full w-[430px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
                <div class="p-5 border-b flex items-center justify-between bg-gray-50">
                    <h2 class="text-xl font-bold">{sidebarMode === 'team' ? 'Edit Team' : (creatingNewEvent ? 'Create Event' : 'Edit Event')}</h2>
                    <button class="text-gray-500 hover:text-black" on:click={closeSidebar}>✕</button>
                </div>
                <div class="p-5 flex-1 overflow-y-auto space-y-6">
                    {#if sidebarMode === 'team'}
                        <div>
                            <label for="team-id" class="form-label block font-semibold mb-1">Team ID</label>
                            <input id="team-id" class="border rounded w-full px-3 py-2" bind:value={draftTeamID} />
                        </div>
                        <fieldset>
                            <legend class="form-label block font-semibold mb-2">Members</legend>
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
                        </fieldset>
                    {:else}
                        <div class="space-y-4">
                            <div>
                                <label for="event-name" class="form-label block font-semibold mb-1">Event Name</label>
                                <input id="event-name" class="border rounded w-full px-3 py-2" bind:value={draftEventName} placeholder="Robotics" />
                            </div>
                            <div>
                                <label for="event-info" class="form-label block font-semibold mb-1">Information</label>
                                <textarea id="event-info" class="border rounded w-full px-3 py-2 h-28 resize-none" bind:value={draftEventInfo} placeholder="Short description"></textarea>
                            </div>
                            <div>
                                <label for="event-max" class="form-label block font-semibold mb-1">Max Members / Team</label>
                                <input id="event-max" type="number" min="1" class="border rounded w-full px-3 py-2" bind:value={draftEventMax} />
                            </div>
                            <div>
                                <label for="event-state-max" class="form-label block font-semibold mb-1">State Max (teams or competitors)</label>
                                <input id="event-state-max" type="number" min="0" class="border rounded w-full px-3 py-2" bind:value={draftEventStateMax} />
                                <p class="text-sm text-gray-500 mt-1">Leave 0 if no separate state quota.</p>
                            </div>
                            <fieldset>
                                <legend class="form-label block font-semibold mb-1">Flags</legend>
                                <div class="flex flex-wrap gap-2">
                                    {#each EVENT_FLAGS as flag}
                                        <label class="flag-option flex items-center gap-1 px-2 py-1 rounded border cursor-pointer select-none transition {draftEventFlags.includes(flag.key) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-600'}">
                                            <input aria-label={flag.label} type="checkbox" class="sr-only" value={flag.key} checked={draftEventFlags.includes(flag.key)} on:change={(e) => toggleFlag(flag.key, (e.target as HTMLInputElement).checked)} />
                                            <span class="w-2 h-2 rounded-full" style="background: currentColor;"></span>
                                            {flag.label}
                                        </label>
                                    {/each}
                                </div>
                            </fieldset>
                            {#if !creatingNewEvent && editingEvent?.teams?.length > 0 && draftEventMax < editingEvent.MaxMembersPerTeam && editingEvent.teams.some((t:any)=> t.Members.length > draftEventMax)}
                                <div class="text-xs text-red-600">Some teams exceed the new max. Adjust team sizes first.</div>
                            {/if}
                        </div>
                    {/if}
                    {#if errorMsg}
                        <div class="text-red-600 text-sm">{errorMsg}</div>
                    {/if}
                    {#if successMsg}
                        <div class="text-green-600 text-sm">{successMsg}</div>
                    {/if}
                </div>
                <div class="p-5 border-t flex gap-3">
                    {#if sidebarMode === 'team'}
                        <button class="btn bg-[#FF6565] text-white font-bold rounded-lg px-4 py-2" on:click={deleteTeam} disabled={saving}>Delete</button>
                        <button class="btn bg-[#658BFF] text-white font-bold rounded-lg px-4 py-2" on:click={saveTeam} disabled={saving}>Save</button>
                    {:else}
                        {#if !creatingNewEvent}
                            <button class="btn bg-[#FF6565] text-white font-bold rounded-lg px-4 py-2" on:click={deleteEvent} disabled={saving}>Delete</button>
                            <button class="btn bg-[#658BFF] text-white font-bold rounded-lg px-4 py-2" on:click={saveEvent} disabled={saving}>Save</button>
                        {:else}
                            <button class="btn bg-[#658BFF] text-white font-bold rounded-lg px-4 py-2" on:click={createEventFinalize} disabled={saving}>Create</button>
                        {/if}
                    {/if}
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
    /* Removed unused th selector (table headers not rendered) */
    td {
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
    .flag-badge {
        font-size: 0.55rem;
        line-height: 1;
        padding: 0.25rem 0.4rem;
        border-radius: 0.375rem;
        border: 1px solid transparent;
        font-weight: 600;
        letter-spacing: .5px;
        text-transform: uppercase;
        white-space: nowrap;
    }
    /* Removed gradient mini-btn styles (not used) */
    .form-label {
        font-size: 0.9rem; /* larger than tailwind text-sm */
        letter-spacing: 0.25px;
        color: #111827;
    }
    .flag-option {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: .3px;
        text-transform: uppercase;
    }
    /* Filter UI */
    .filter-bar { border: 1px solid #e5e7eb; }
    .flag-chip {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.55rem;
        font-weight: 600;
        letter-spacing: .35px;
        text-transform: uppercase;
        padding: 0.42rem 0.65rem 0.38rem 0.6rem;
        background: #f8fafc; /* slate-50 */
        color: #334155; /* slate-700 */
        border-radius: 0.6rem;
        border: 1px solid #e2e8f0; /* slate-200 */
        transition: background .18s, color .18s, border-color .18s, box-shadow .18s, transform .15s;
    }
    .flag-chip .dot {
        width: 6px; height: 6px; border-radius: 50%; background: var(--dot-color,#6366f1); box-shadow: 0 0 0 2px #ffffff, 0 0 0 3px rgba(0,0,0,0.1);
    }
    .flag-chip .check { font-size: 0.6rem; font-weight: 700; }
    .flag-chip:hover { background: #f1f5f9; }
    .flag-chip:active { transform: translateY(1px); }
    .flag-chip.active { background: #eef2ff; color: #1e3a8a; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.25); }
    .flag-chip.active .dot { background: #6366f1; box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(99,102,241,0.35); }
    .flag-chip .label-text { white-space: nowrap; }
    .flag-chip:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    .filter-bar::-webkit-scrollbar { height: 6px; }
    .filter-bar::-webkit-scrollbar-track { background: transparent; }
    .filter-bar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    @media (max-width: 768px) {
        .flag-chip { font-size: 0.6rem; }
    }
    @media (min-width: 1024px) {
        .form-label { font-size: 0.95rem; }
        .flag-option { font-size: 0.72rem; }
    }
</style>
