<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { appwriteDatabases, appwriteUser } from "$lib/index";
    import { DB_ID, COLLECTION } from "$lib/ids";

    let selectedOrgs: string[] = [];
    let userName = "";
    let userId = "";
    let loading = false;
    let errorMsg = "";

    const organizations = [
        { 
            id: 'TSA', 
            name: 'Technology Student Association (TSA)',
            description: 'Engineering, technology, and leadership competitions',
            color: 'bg-blue-100 border-blue-300 text-blue-800'
        },
        { 
            id: 'FBLA', 
            name: 'Future Business Leaders of America (FBLA)',
            description: 'Business, leadership, and entrepreneurship events',
            color: 'bg-green-100 border-green-300 text-green-800'
        },
        { 
            id: 'HOSA', 
            name: 'Health Occupations Students of America (HOSA)',
            description: 'Healthcare, medical, and health science competitions',
            color: 'bg-red-100 border-red-300 text-red-800'
        }
    ];

    onMount(async () => {
        try {
            const user = await appwriteUser.get();
            userName = user.name;
            userId = user.$id;

            // Check if user already has organization preferences
            const studentDocs = await appwriteDatabases.listDocuments(
                DB_ID,
                COLLECTION.Students,
                // Query by Name field since we use that as identifier
            );
            
            const existingStudent = studentDocs.documents.find((doc: any) => doc.Name === userName);
            if (existingStudent && existingStudent.Organizations) {
                selectedOrgs = existingStudent.Organizations;
            }
        } catch (error) {
            console.error("Failed to load user data:", error);
        }
    });

    function toggleOrg(orgId: string) {
        if (selectedOrgs.includes(orgId)) {
            selectedOrgs = selectedOrgs.filter(id => id !== orgId);
        } else {
            selectedOrgs = [...selectedOrgs, orgId];
        }
    }

    async function savePreferences() {
        if (selectedOrgs.length === 0) {
            errorMsg = "Please select at least one organization";
            return;
        }

        loading = true;
        errorMsg = "";

        try {
            // Find existing student document
            const studentDocs = await appwriteDatabases.listDocuments(
                DB_ID,
                COLLECTION.Students
            );
            
            const existingStudent = studentDocs.documents.find((doc: any) => doc.Name === userName);

            if (existingStudent) {
                // Update existing student with organizations
                await appwriteDatabases.updateDocument(
                    DB_ID,
                    COLLECTION.Students,
                    existingStudent.$id,
                    { Organizations: selectedOrgs }
                );
            } else {
                // This shouldn't happen, but create if needed
                const { ID } = await import('appwrite');
                await appwriteDatabases.createDocument(
                    DB_ID,
                    COLLECTION.Students,
                    ID.unique(),
                    { 
                        Name: userName,
                        Organizations: selectedOrgs
                    }
                );
            }

            // Redirect to dashboard
            goto('/dashboard');
        } catch (error: any) {
            errorMsg = error.message || "Failed to save preferences";
            console.error(error);
        } finally {
            loading = false;
        }
    }
</script>

<main class="min-h-screen bg-gray-50">
    <nav class="flex items-center justify-between px-4 py-4 bg-white border-b">
        <a class="text-2xl font-semibold tracking-tight" href="/">Matrix</a>
    </nav>

    <section class="max-w-3xl mx-auto px-4 py-12">
        <header class="text-center mb-8">
            <h1 class="text-3xl font-bold mb-2">Select Your Organizations</h1>
            <p class="text-gray-600">Choose which competitive organizations you're participating in. You can select multiple.</p>
        </header>

        <div class="space-y-4 mb-8">
            {#each organizations as org}
                <button
                    type="button"
                    class="w-full text-left border-2 rounded-xl p-5 transition-all {selectedOrgs.includes(org.id) ? `${org.color} border-current shadow-md` : 'bg-white border-gray-200 hover:border-gray-300'}"
                    on:click={() => toggleOrg(org.id)}
                >
                    <div class="flex items-start gap-4">
                        <div class="flex-shrink-0 mt-1">
                            <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center {selectedOrgs.includes(org.id) ? 'bg-white border-current' : 'border-gray-300'}">
                                {#if selectedOrgs.includes(org.id)}
                                    <svg class="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                    </svg>
                                {/if}
                            </div>
                        </div>
                        <div class="flex-1">
                            <h3 class="text-lg font-bold mb-1">{org.name}</h3>
                            <p class="text-sm opacity-80">{org.description}</p>
                        </div>
                    </div>
                </button>
            {/each}
        </div>

        {#if errorMsg}
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {errorMsg}
            </div>
        {/if}

        <div class="flex gap-3 justify-center">
            <button
                class="btn bg-gray-200 text-gray-700 font-bold rounded-lg px-6 py-3"
                on:click={() => goto('/dashboard')}
                disabled={loading}
            >
                Skip for Now
            </button>
            <button
                class="btn bg-[#658BFF] text-white font-bold rounded-lg px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                on:click={savePreferences}
                disabled={loading || selectedOrgs.length === 0}
            >
                {loading ? 'Saving...' : 'Save & Continue'}
            </button>
        </div>

        {#if selectedOrgs.length > 0}
            <p class="text-center text-sm text-gray-500 mt-4">
                You selected: {selectedOrgs.map(id => organizations.find(o => o.id === id)?.id).join(', ')}
            </p>
        {/if}
    </section>
</main>
