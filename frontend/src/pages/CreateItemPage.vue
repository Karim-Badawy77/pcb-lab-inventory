<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import FeedbackMessage from '@/components/FeedbackMessage.vue';
import ItemForm from '@/features/item-form/ItemForm.vue';
import { emptyItemForm, toItemFormData } from '@/features/item-form/item-form';
import { apiRequest } from '@/lib/api';

const router = useRouter();
const busy = ref(false);
const error = ref('');
const dirty = ref(false);
const submitted = ref(false);

function setDirty(value) { dirty.value = value; }

async function createItem({ form, files, removeImageIds }) {
  busy.value = true;
  error.value = '';
  try {
    const item = await apiRequest('/api/items', { method: 'POST', body: toItemFormData(form, files, removeImageIds) });
    submitted.value = true;
    dirty.value = false;
    await router.push(`/items/${item._id}`);
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    busy.value = false;
  }
}

function beforeUnload(event) {
  if (!dirty.value || submitted.value) return;
  event.preventDefault();
  event.returnValue = '';
}

onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave(() => !dirty.value || submitted.value || window.confirm('Discard your unsaved item?'));
</script>

<template>
  <main class="page editor-page">
    <header class="editor-hero">
      <RouterLink class="back-link" to="/items">← Inventory</RouterLink>
      <span class="eyebrow eyebrow--light">New inventory record</span>
      <h1>Catalog a new component.</h1>
      <p>Document the board, assign its current state, and add clear photos.</p>
    </header>
    <FeedbackMessage :message="error" />
    <ItemForm :initial-item="emptyItemForm()" :busy="busy" submit-label="Create item" @submit="createItem" @dirty-change="setDirty" />
  </main>
</template>
