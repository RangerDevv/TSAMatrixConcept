<script>
    import { getCurrSession, logOutUser } from "$lib/auth";
    import { onMount } from "svelte";

    let isAdmin = false;
    let isRegisterOpen = true;

    onMount(async () => {
        console.log(await getCurrSession());
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
</main>
