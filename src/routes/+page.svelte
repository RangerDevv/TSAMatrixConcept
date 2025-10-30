<script lang="ts">
    import { createUser, getCurrSession, logInUser } from "$lib/auth";
    import { onMount } from "svelte";

    // UI state
    let mode: 'login' | 'signup' = 'login';
    let loading = false;
    let errorMsg = '';

    // Form state
    let email = '';
    let password = '';
    let firstName = '';
    let lastName = '';

    // Derived validation state (reactive)
    $: isLoginValid = email.trim().length > 0 && password.trim().length > 0;
    $: isSignupValid = email.trim().length > 0 && firstName.trim().length > 0 && lastName.trim().length > 0 && password.trim().length > 0;

    onMount(() => {
        getCurrSession().then((session) => {
            if (session) {
                window.location.href = "/dashboard";
            }
        });
    });

    function validLogin() { return isLoginValid; }
    function validSignup() { return isSignupValid; }

    async function handleLogin() {
        if (!validLogin()) { errorMsg = 'Please enter your email and password.'; return; }
        loading = true; errorMsg = '';
        try {
                // Login does not require name
                await logInUser(email.trim(), password.trim());
        } catch (e: any) {
            errorMsg = e?.message || 'Login failed. Please try again.';
        } finally { loading = false; }
    }

    async function handleSignup() {
        if (!validSignup()) { errorMsg = 'Please fill out all fields.'; return; }
        loading = true; errorMsg = '';
        try {
                const fullName = `${firstName.trim()} ${lastName.trim()}`;
                await createUser(email.trim(), fullName, password.trim());
        } catch (e: any) {
            errorMsg = e?.message || 'Sign up failed. Please try again.';
        } finally { loading = false; }
    }
</script>

<main class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
        <div class="text-center mb-6">
            <h1 class="text-3xl font-extrabold tracking-tight text-gray-900">TSA Matrix</h1>
            <p class="text-sm text-gray-500">Welcome! Sign in or create your account to continue.</p>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <!-- Tabs -->
            <div class="grid grid-cols-2">
                <button
                    class={`py-3 text-sm font-semibold ${mode === 'login' ? 'text-[#1f2937] bg-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                    on:click={() => { mode = 'login'; errorMsg = ''; }}
                    type="button"
                >Sign In</button>
                <button
                    class={`py-3 text-sm font-semibold ${mode === 'signup' ? 'text-[#1f2937] bg-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                    on:click={() => { mode = 'signup'; errorMsg = ''; }}
                    type="button"
                >Create Account</button>
            </div>

            <div class="p-5 space-y-4">
                {#if errorMsg}
                    <div class="text-sm text-red-600">{errorMsg}</div>
                {/if}

                <!-- Email -->
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input id="email" type="email" bind:value={email} required
                           class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="you@example.com" />
                </div>

                <!-- Name fields (signup only) -->
                {#if mode === 'signup'}
                    <div>
                        <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input id="firstName" type="text" bind:value={firstName} required
                               class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                               placeholder="First" />
                    </div>
                    <div>
                        <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input id="lastName" type="text" bind:value={lastName} required
                               class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                               placeholder="Last" />
                    </div>
                {/if}

                <!-- Password -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input id="password" type="password" bind:value={password} required
                           class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="••••••••" />
                </div>

                <!-- Actions -->
                <div class="pt-2">
                    {#if mode === 'login'}
                        <button
                            class="w-full bg-[#658BFF] hover:brightness-110 text-white font-bold rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            on:click|preventDefault={handleLogin}
                            disabled={loading || !isLoginValid}
                        >{loading ? 'Signing in…' : 'Sign In'}</button>
                        <p class="mt-2 text-xs text-gray-500">If this is your first time, switch to “Create Account”.</p>
                    {:else}
                        <button
                            class="w-full bg-[#658BFF] hover:brightness-110 text-white font-bold rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            on:click|preventDefault={handleSignup}
                            disabled={loading || !isSignupValid}
                        >{loading ? 'Creating account…' : 'Create Account'}</button>
                        <p class="mt-2 text-xs text-gray-500">Already have an account? Switch to “Sign In”.</p>
                    {/if}
                </div>
            </div>
        </div>
        <p class="text-center text-[11px] text-gray-400 mt-4">By continuing you agree to our acceptable use policy.</p>
    </div>
</main>
