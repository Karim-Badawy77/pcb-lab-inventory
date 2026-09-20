<script setup>
import { onMounted, ref } from 'vue'; import { useRoute, useRouter } from 'vue-router'; import RepairmentForm from '@/features/repairment-form/RepairmentForm.vue'; import FeedbackMessage from '@/components/FeedbackMessage.vue'; import { apiRequest, fetchAllItems } from '@/lib/api'; import { collectFormSuggestions } from '@/features/item-form/item-form';
const route = useRoute(); const router = useRouter(); const error = ref(''); const busy = ref(false); const suggestions = ref({});
onMounted(async () => { try { suggestions.value = collectFormSuggestions(await fetchAllItems()); } catch {} });
async function save(form) { busy.value = true; try { const result = await apiRequest(`/api/repairments/item/${route.params.itemId}`, { method: 'POST', body: JSON.stringify(form) }); await router.push(`/repairments/${result._id}`); } catch (e) { error.value = e.message; } finally { busy.value = false; } }
</script>
<template><main class="page editor-page"><header class="editor-hero"><RouterLink class="back-link" :to="`/items/${route.params.itemId}`">← Item details</RouterLink><span class="eyebrow eyebrow--light">New repairment</span><h1>Open a repairment record.</h1></header><FeedbackMessage :message="error" /><RepairmentForm :busy="busy" :suggestions="suggestions" @submit="save" /></main></template>
