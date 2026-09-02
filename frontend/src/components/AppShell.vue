<template>
    <div class="app-shell">
        <header class="site-header">
            <RouterLink class="brand" to="/items"
                ><span class="brand-mark">PL</span
                ><span
                    ><strong>PCB LAB</strong><small>Inventory</small></span
                ></RouterLink
            >
            <nav aria-label="Primary navigation">
                <RouterLink to="/items">Browse</RouterLink>
                <RouterLink class="nav-add" to="/items/new"
                    >＋ <span>New item</span></RouterLink
                >
                <button
                    type="button"
                    class="nav-add"
                    data-testid="health-check"
                    @click="checkHealth"
                >
                    Check server
                </button>
            </nav>
        </header>
        <RouterView />
        <footer class="site-footer">
            <span>PCB LAB / INVENTORY</span
            ><span>Local system · Offline ready</span>
        </footer>
    </div>
</template>

<script setup>
import { apiRequest } from "@/lib/api";

async function checkHealth() {
    let timeOut = 5000;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeOut);
    const timeoutResponse = new Promise((_, reject) => {
        window.setTimeout(
            () => reject(new Error("Health check timed out")),
            timeOut,
        );
    });
    try {
        await Promise.race([
            apiRequest("/api/health", { signal: controller.signal }),
            timeoutResponse,
        ]);
        window.alert("Server is Live");
    } catch {
        window.alert("No response");
    } finally {
        window.clearTimeout(timeout);
    }
}
</script>
