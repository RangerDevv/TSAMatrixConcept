<script lang="ts">
    import { createUser, getCurrSession } from "$lib/auth";
  import { onMount } from "svelte";

    export let email = "";
    export let name = "";
    export let password = "";

    onMount(() => {
        getCurrSession().then(session => {
            if (session) {
                // User is already logged in, redirect to dashboard
                window.location.href = "/dashboard";
            }
        });
    });

    async function handleSubmit() {
        await createUser(email, name, password);
    }
</script>

<p class="text-center text-lg pt-7">TSA MATRIX</p>

<form on:submit={handleSubmit} class="flex flex-col gap-4 p-4 max-w-md mx-auto mt-10 border border-gray-300 rounded-lg">
    <label for="email">Email:</label>
    <input type="email" id="email" bind:value={email} required class="border border-gray-300 p-2 rounded-lg bg-gray-400" />
    <label for="name">Name (Please Enter your Full Name!):</label>
    <input type="text" id="name" bind:value={name} required class="border border-gray-300 p-2 rounded-lg bg-gray-400" />
    <label for="password">Password:</label>
    <input type="password" id="password" bind:value={password} required class="border border-gray-300 p-2 rounded-lg bg-gray-400" />
    <button type="submit" on:click={handleSubmit} class="bg-[#658BFF] text-white p-2 rounded-lg">Sign Up</button>
</form>
