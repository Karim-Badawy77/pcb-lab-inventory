<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import FeedbackMessage from "@/components/FeedbackMessage.vue";
import StatusBadge from "@/components/StatusBadge.vue";
import DeleteItemDialog from "@/features/item-detail/DeleteItemDialog.vue";
import AddUnitsDialog from "@/features/item-detail/AddUnitsDialog.vue";
import HistoryTimeline from "@/features/item-detail/HistoryTimeline.vue";
import RepairmentCard from "@/features/item-detail/RepairmentCard.vue";
import ImageGallery from "@/features/item-detail/ImageGallery.vue";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { formatLocation } from "@/lib/inventory";

const route = useRoute();
const router = useRouter();
const item = ref(null);
const repairments = ref([]);
const repairmentCount = computed(
    () => repairments.value.filter((row) => row.status !== "golden").length,
);
const goldenCount = computed(
    () => repairments.value.filter((row) => row.status === "golden").length,
);
const loading = ref(true);
const error = ref("");
const success = ref("");
const dirty = ref(false);
const deleteOpen = ref(false);
const deleteBusy = ref(false);
const deleteError = ref("");
const deleteTrigger = ref(null);
const addUnitsOpen = ref(false);
const addUnitsBusy = ref(false);
const addUnitsError = ref("");
const addUnitsTrigger = ref(null);

async function loadItem() {
    loading.value = true;
    error.value = "";
    try {
        item.value = await apiRequest(`/api/items/${route.params.id}`);
        document.title = item.value.name;
        try {
            repairments.value =
                (await apiRequest(
                    `/api/repairments/item/${route.params.id}`,
                )) || [];
        } catch {
            repairments.value = [];
        }
    } catch (loadError) {
        error.value = loadError.message;
    } finally {
        loading.value = false;
    }
}

function openDelete() {
    deleteError.value = "";
    deleteOpen.value = true;
}

function openAddUnits() {
    addUnitsError.value = "";
    addUnitsOpen.value = true;
}

async function closeAddUnits() {
    if (addUnitsBusy.value) return;
    addUnitsOpen.value = false;
    await Promise.resolve();
    addUnitsTrigger.value?.focus();
}

async function addUnits(quantity) {
    addUnitsBusy.value = true;
    addUnitsError.value = "";
    try {
        await apiRequest(`/api/items/${item.value._id}/units`, { method: "POST", body: JSON.stringify({ quantity }) });
        addUnitsOpen.value = false;
        success.value = `${quantity} unit${quantity === 1 ? "" : "s"} added.`;
        await loadItem();
    } catch (requestError) {
        addUnitsError.value = requestError.message;
    } finally {
        addUnitsBusy.value = false;
    }
}

async function closeDelete() {
    if (deleteBusy.value) return;
    deleteOpen.value = false;
    await Promise.resolve();
    deleteTrigger.value?.focus();
}

async function deleteItem() {
    deleteBusy.value = true;
    deleteError.value = "";
    try {
        await apiRequest(`/api/items/${item.value._id}`, { method: "DELETE" });
        deleteOpen.value = false;
        await router.push("/items");
    } catch (requestError) {
        deleteError.value = requestError.message;
    } finally {
        deleteBusy.value = false;
    }
}

function beforeUnload(event) {
    if (!dirty.value) return;
    event.preventDefault();
    event.returnValue = "";
}

watch(() => route.params.id, loadItem);
onMounted(() => {
    loadItem();
    window.addEventListener("beforeunload", beforeUnload);
});
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
onBeforeRouteLeave(
    () => !dirty.value || window.confirm("Discard your unsaved edits?"),
);
</script>

<template>
    <main class="page detail-page">
        <div v-if="loading" class="state-panel">
            <p>Loading item record…</p>
        </div>
        <template v-else-if="error && !item">
            <FeedbackMessage :message="error" />
            <div class="state-panel">
                <button
                    class="button button--primary"
                    data-testid="retry-detail"
                    @click="loadItem"
                >
                    Try again
                </button>
            </div>
        </template>
        <template v-else-if="item">
            <header class="detail-heading">
                <RouterLink class="back-link" to="/items"
                    >← Inventory</RouterLink
                >
                <div class="detail-title-row">
                    <div>
                        <span class="part-number">{{ item.part_num }}</span>
                        <h1>{{ item.name }}</h1>
                    </div>
                    <div class="detail-heading-actions">
                    <button ref="addUnitsTrigger" type="button" class="button button--lime" data-testid="open-add-units" @click="openAddUnits">Add units</button>
                    <RouterLink
                        class="button button--lime"
                        data-testid="edit-item"
                        :to="`/items/${item._id}/edit`"
                        >Edit item</RouterLink
                    >
                    </div>
                </div>
                <div class="detail-status">
                    <StatusBadge
                        :stored="item.stored"
                        :under-repairment="item.under_repairment"
                    /><span>⌖ {{ formatLocation(item) }}</span>
                </div>
            </header>

            <FeedbackMessage :message="error" /><FeedbackMessage
                :message="success"
                type="success"
            />
            <div class="detail-layout">
                <ImageGallery :images="item.images" :item-name="item.name" />
                <aside class="record-panel">
                    <span class="eyebrow">Record details</span>
                    <dl class="record-grid">
                        <div>
                            <dt>Organization</dt>
                            <dd>{{ item.organization || "—" }}</dd>
                        </div>
                        <div>
                            <dt>Total received</dt>
                            <dd>{{ item.total_quantity ?? 1 }}</dd>
                        </div>
                        <div>
                            <dt>Currently available</dt>
                            <dd>
                                {{
                                    item.available_quantity ??
                                    item.total_quantity ??
                                    1
                                }}
                            </dd>
                        </div>
                        <div>
                            <dt>Delivered units</dt>
                            <dd>{{ (item.total_quantity ?? 1) - (item.available_quantity ?? item.total_quantity ?? 1) }}</dd>
                        </div>
                        <div>
                            <dt>Status</dt>
                            <dd>
                                {{
                                    item.under_repairment
                                        ? "Repairing"
                                        : item.stored
                                          ? "Stored"
                                          : "Delivered"
                                }}
                            </dd>
                        </div>
                        <div>
                            <dt>
                                {{ item.stored ? "Location" : "Delivered to" }}
                            </dt>
                            <dd>{{ formatLocation(item) }}</dd>
                        </div>
                        <div v-if="item.delivered_by">
                            <dt>Delivered by</dt>
                            <dd>{{ item.delivered_by }}</dd>
                        </div>
                        <div>
                            <dt>Modified</dt>
                            <dd>{{ formatDate(item.dates?.modified) }}</dd>
                        </div>
                    </dl>
                    <div class="tag-row">
                        <span v-for="tag in item.tags || []" :key="tag"
                            >#{{ tag }}</span
                        >
                    </div>
                </aside>
            </div>

            <section class="detail-section">
                <span class="eyebrow">Description</span>
                <h2>About this board</h2>
                <p class="prose">
                    {{ item.description || "No description recorded." }}
                </p>
            </section>
            <section class="detail-section">
                <span class="eyebrow">Field notes</span>
                <h2>Updates</h2>
                <div v-if="item.updates?.length" class="updates-list">
                    <article
                        v-for="update in item.updates"
                        :key="update._id || update.createdAt"
                    >
                        <p>{{ update.text }}</p>
                        <time :datetime="update.createdAt">{{
                            formatDate(update.createdAt)
                        }}</time>
                    </article>
                </div>
                <p v-else class="muted">No update notes recorded.</p>
            </section>
            <section class="detail-section">
                <span class="eyebrow">Repair queue</span>
                <h2>
                    Unit repairments
                    <span
                        class="repairment-count"
                        data-testid="repairment-count"
                        :aria-label="`${repairmentCount} repairment${repairmentCount === 1 ? '' : 's'}`"
                        >{{ repairmentCount }}</span
                    >
                </h2>
                <p class="muted">
                    {{ goldenCount }} Golden unit{{
                        goldenCount === 1 ? "" : "s"
                    }}
                    (functional, never repaired).
                </p>
                <RouterLink
                    class="button button--ghost"
                    :to="`/items/${item._id}/repairments/new`"
                    >Add repairment</RouterLink
                >
                <div v-if="repairments.length" class="repairment-grid">
                    <RepairmentCard
                        v-for="repairment in repairments"
                        :key="repairment._id"
                        :repairment="repairment"
                    />
                </div>
                <p v-if="!repairmentCount" class="muted">
                    No repairments recorded.
                </p>
            </section>
            <section class="detail-section">
                <span class="eyebrow">Logs</span>
                <h2>Transaction history</h2>
                <p class="muted log-hint">Listed from newest to oldest.</p>
                <HistoryTimeline
                    :history="
                        (item.history || []).filter(
                            (entry) => !entry.repairment_id,
                        )
                    "
                />
            </section>
            <section class="danger-zone">
                <div>
                    <span class="eyebrow eyebrow--danger">Danger zone</span>
                    <h2>Remove from active inventory</h2>
                    <p>
                        This action soft-deletes the record and writes a final
                        history transaction.
                    </p>
                </div>
                <button
                    ref="deleteTrigger"
                    type="button"
                    class="button button--danger-outline"
                    data-testid="open-delete"
                    @click="openDelete"
                >
                    Delete item
                </button>
            </section>
            <DeleteItemDialog
                v-if="deleteOpen"
                :item="item"
                :busy="deleteBusy"
                :error="deleteError"
                @confirm="deleteItem"
                @close="closeDelete"
            />
            <AddUnitsDialog v-if="addUnitsOpen" :busy="addUnitsBusy" :error="addUnitsError" @confirm="addUnits" @close="closeAddUnits" />
        </template>
    </main>
</template>
