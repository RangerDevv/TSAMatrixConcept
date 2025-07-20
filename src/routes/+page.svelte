<script>
    import { createUser } from "$lib/auth";

    export let email = "";
    export let name = "";
    export let password = "";

    async function handleSubmit() {
        await createUser(email, name, password);
    }
</script>

<form on:submit={handleSubmit}>
    <label for="email">Email:</label>
    <input type="email" id="email" bind:value={email} required />
    <label for="name">Name:</label>
    <input type="text" id="name" bind:value={name} required />
    <label for="password">Password:</label>
    <input type="password" id="password" bind:value={password} required />
    <button type="submit" on:click={handleSubmit}>Sign Up</button>
</form>
