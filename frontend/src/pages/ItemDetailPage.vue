<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import FeedbackMessage from '@/components/FeedbackMessage.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DeleteItemDialog from '@/features/item-detail/DeleteItemDialog.vue';
import HistoryTimeline from '@/features/item-detail/HistoryTimeline.vue';
import RepairmentCard from '@/features/item-detail/RepairmentCard.vue';
import ImageGallery from '@/features/item-detail/ImageGallery.vue';
import ItemForm from '@/features/item-form/ItemForm.vue';
import { toItemFormData } from '@/features/item-form/item-form';
import { apiRequest } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { formatLocation } from '@/lib/inventory';

const route = useRoute();
const router = useRouter();
const item = ref(null);
const repairments = ref([]);
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const success = ref('');
const editing = ref(false);
const dirty = ref(false);
const deleteOpen = ref(false);
const deleteBusy = ref(false);
const deleteError = ref('');
const deleteTrigger = ref(null);

async function loadItem() {
  loading.value = true;
  error.value = '';
  try {
    item.value = await apiRequest(`/api/items/${route.params.id}`);
    try { repairments.value = (await apiRequest(`/api/repairments/item/${route.params.id}`)) || []; } catch { repairments.value = []; }
  }
  catch (loadError) { error.value = loadError.message; }
  finally { loading.value = false; }
}

async function saveItem({ form, files, removeImageIds }) {
  busy.value = true;
  error.value = '';
  success.value = '';
  try {
    await apiRequest(`/api/items/${item.value._id}`, { method: 'PATCH', body: toItemFormData(form, files, removeImageIds) });
    dirty.value = false;
    editing.value = false;
    await loadItem();
    success.value = 'Item updated.';
  } catch (requestError) { error.value = requestError.message; }
  finally { busy.value = false; }
}

function cancelEdit() {
  if (dirty.value && !window.confirm('Discard your unsaved edits?')) return;
  dirty.value = false;
  editing.value = false;
}

function openDelete() {
  deleteError.value = '';
  deleteOpen.value = true;
}

async function closeDelete() {
  if (deleteBusy.value) return;
  deleteOpen.value = false;
  await Promise.resolve();
  deleteTrigger.value?.focus();
}

async function deleteItem() {
  deleteBusy.value = true;
  deleteError.value = '';
  try {
    await apiRequest(`/api/items/${item.value._id}`, { method: 'DELETE' });
    deleteOpen.value = false;
    await router.push('/items');
  } catch (requestError) {
    deleteError.value = requestError.message;
  } finally {
    deleteBusy.value = false;
  }
}

function beforeUnload(event) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}

watch(() => route.params.id, loadItem);
onMounted(() => {
  loadItem();
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave(() => !dirty.value || window.confirm('Discard your unsaved edits?'));
</script>

<template>
  <main class="page detail-page">
    <div v-if="loading" class="state-panel"><p>Loading item record…</p></div>
    <template v-else-if="error && !item">
      <FeedbackMessage :message="error" />
      <div class="state-panel"><button class="button button--primary" data-testid="retry-detail" @click="loadItem">Try again</button></div>
    </template>
    <template v-else-if="item">
      <header class="detail-heading">
        <RouterLink class="back-link" to="/items">← Inventory</RouterLink>
        <div class="detail-title-row">
          <div><span class="part-number">{{ item.part_num }}</span><h1>{{ item.name }}</h1></div>
          <button v-if="!editing" class="button button--lime" data-testid="edit-item" @click="editing = true">Edit item</button>
        </div>
        <div class="detail-status"><StatusBadge :stored="item.stored" /><span>⌖ {{ formatLocation(item) }}</span></div>
      </header>

      <FeedbackMessage :message="error" /><FeedbackMessage :message="success" type="success" />
      <ItemForm v-if="editing" :initial-item="item" :busy="busy" submit-label="Update item" @submit="saveItem" @dirty-change="dirty = true" @cancel="cancelEdit" />

      <template v-else>
        <div class="detail-layout">
          <ImageGallery :images="item.images" :item-name="item.name" />
          <aside class="record-panel">
            <span class="eyebrow">Record details</span>
            <dl class="record-grid">
              <div><dt>Category</dt><dd>{{ item.category || '—' }}</dd></div>
              <div><dt>Owner</dt><dd>{{ item.owner || '—' }}</dd></div>
              <div><dt>Status</dt><dd>{{ item.stored ? 'Stored' : 'Delivered' }}</dd></div>
              <div><dt>{{ item.stored ? 'Location' : 'Delivered to' }}</dt><dd>{{ formatLocation(item) }}</dd></div>
              <div v-if="item.delivered_by"><dt>Delivered by</dt><dd>{{ item.delivered_by }}</dd></div>
              <div><dt>Modified</dt><dd>{{ formatDate(item.dates?.modified) }}</dd></div>
            </dl>
            <div class="tag-row"><span v-for="tag in item.tags || []" :key="tag">#{{ tag }}</span></div>
          </aside>
        </div>

        <section class="detail-section"><span class="eyebrow">Description</span><h2>About this board</h2><p class="prose">{{ item.description || 'No description recorded.' }}</p></section>
        <section class="detail-section"><span class="eyebrow">Field notes</span><h2>Updates</h2><div v-if="item.updates?.length" class="updates-list"><article v-for="update in item.updates" :key="update._id || update.createdAt"><p>{{ update.text }}</p><time :datetime="update.createdAt">{{ formatDate(update.createdAt) }}</time></article></div><p v-else class="muted">No update notes recorded.</p></section>
        <section v-if="repairments.length" class="detail-section"><span class="eyebrow">Repair queue</span><h2>Unit repairments</h2><div class="repairment-grid"><RepairmentCard v-for="repairment in repairments" :key="repairment._id" :repairment="repairment" /></div></section>
        <section class="detail-section"><span class="eyebrow">Movement log</span><h2>Transaction history</h2><HistoryTimeline :history="item.history" /></section>
        <section class="danger-zone"><div><span class="eyebrow eyebrow--danger">Danger zone</span><h2>Remove from active inventory</h2><p>This action soft-deletes the record and writes a final history transaction.</p></div><button ref="deleteTrigger" type="button" class="button button--danger-outline" data-testid="open-delete" @click="openDelete">Delete item</button></section>
      </template>
      <DeleteItemDialog v-if="deleteOpen" :item="item" :busy="deleteBusy" :error="deleteError" @confirm="deleteItem" @close="closeDelete" />
    </template>
  </main>
</template>
