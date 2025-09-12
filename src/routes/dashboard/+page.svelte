<script lang="ts">
    import { getCurrSession, logOutUser } from "$lib/auth";
    import { onMount } from "svelte";
    import { appwriteDatabases, appwriteUser } from "$lib/index";
    import { Query } from "appwrite";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let isAdmin = false;
    let isRegisterOpen = true;
    let name = "";
    let events = [] as any[]; // team documents the user is a member of

    // Reuse flag system from matrix page
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
    const FLAG_MAP: Record<string, { key: string; label: string; color: string }> = Object.fromEntries(EVENT_FLAGS.map(f => [f.key, f]));
    const FLAG_TOKEN_PREFIX = '[FLG:';

    function extractFlags(info: string | null | undefined): { base: string; flags: string[] } {
        if (!info) return { base: '', flags: [] };
        const flagPattern = /\[FLG:([A-Z0-9_\-]+)\]/g;
        const flags: string[] = [];
        const base = info.replace(flagPattern, (_m, key) => { flags.push(key); return ''; }).trim();
        return { base: base.replace(/\n{2,}/g, '\n'), flags: Array.from(new Set(flags)) };
    }

    onMount(async () => {
        const user = await appwriteUser.get();
        name = user.name || "Unknown User";
        let teamDocs: any[] = [];
        let attempts: any[] = [];
        // Try multiple equality formats (Appwrite array field matching can vary by SDK/version)
        try {
            attempts.push('Members = name');
            const r1 = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Teams, [Query.equal('Members', name)]);
            teamDocs = r1.documents;
        } catch (e) { console.warn('First members query failed', e); }
        if (teamDocs.length === 0) {
            try {
                attempts.push('Members = [name]');
                const r2 = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Teams, [Query.equal('Members', [name])]);
                teamDocs = r2.documents;
            } catch (e) { console.warn('Second members query failed', e); }
        }
        if (teamDocs.length === 0) {
            try {
                attempts.push('Members IN name');
                const r3 = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Teams, [Query.search('Members', name)]);
                teamDocs = r3.documents;
            } catch (e) { console.warn('Search members query failed', e); }
        }
        // Enrich teams with parsed info from their own Information field
        events = teamDocs.map(teamDoc => {
            const parsed = extractFlags(teamDoc.Information);
            teamDoc._baseInfo = parsed.base;
            teamDoc._flags = parsed.flags;
            return teamDoc;
        });
        // If still no events, attempt to fetch Events and correlate; this does not alter card layout
        if (events.length === 0) {
            try {
                const evResp = await appwriteDatabases.listDocuments(DB_ID, COLLECTION.Events, [Query.select(['*','teams.*'])]);
                const eventDocs = evResp.documents.map(ev => {
                    const parsed = extractFlags(ev.Information);
                    ev._baseInfo = parsed.base; ev._flags = parsed.flags; return ev;
                });
                // Flatten any teams that include user
                const userTeams: any[] = [];
                for (const ev of eventDocs) {
                    if (Array.isArray(ev.teams)) {
                        for (const t of ev.teams) {
                            if (t?.Members?.includes(name)) {
                                // clone team t and attach event context
                                const clone = { ...t };
                                if (!clone._baseInfo) clone._baseInfo = ev._baseInfo;
                                if (!clone._flags) clone._flags = ev._flags;
                                clone._eventName = ev.Name;
                                events.push(clone);
                            }
                        }
                    }
                }
            } catch (e) { console.warn('Fallback events fetch failed', e); }
        }
        console.log('Dashboard fetch attempts:', attempts, 'Final team count:', events.length);
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
                    <h3 class="text-xl font-bold">{event._eventName || event.TeamID}</h3>
                    <h3 class="text-lg">{event.TeamID}</h3>
                    {#if event._baseInfo}
                        <p class="text-sm text-gray-700 whitespace-pre-line">{event._baseInfo}</p>
                    {/if}
                    {#if event._flags && event._flags.length > 0}
                        <div class="flex flex-wrap gap-1 mt-1">
                            {#each event._flags as fk}
                                {#if FLAG_MAP[fk]}
                                    <span class="flag-badge {FLAG_MAP[fk].color}">{FLAG_MAP[fk].label}</span>
                                {:else}
                                    <span class="flag-badge bg-gray-100 text-gray-600 border-gray-300">{fk}</span>
                                {/if}
                            {/each}
                        </div>
                    {/if}
                    <p class="text-sm">Members: {event.Members?.join(', ')}</p>
                </div>
            {/each}
            {#if events.length === 0}
                <p class="text-sm text-gray-500 italic m-4">No teams found for your account.</p>
            {/if}
        </div>
</main>

<style>
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
</style>
