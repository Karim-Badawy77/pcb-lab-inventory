<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import FeedbackMessage from '@/components/FeedbackMessage.vue';
import { apiRequest } from '@/lib/api';
import { formatDate } from '@/lib/dates';
const route = useRoute(); const repairment = ref(null); const error = ref(''); const loading = ref(true);
onMounted(async () => { try { repairment.value = await apiRequest(`/api/repairments/${route.params.id}`); } catch (requestError) { error.value = requestError.message; } finally { loading.value = false; } });
</script>
<template>
  <main class="page detail-page"><RouterLink class="back-link" to="/items">← Inventory</RouterLink><FeedbackMessage :message="error" />
    <div v-if="loading" class="state-panel"><p>Loading repairment…</p></div>
    <template v-else-if="repairment"><header class="detail-heading"><span class="eyebrow">Repairment detail</span><div class="detail-title-row"><div><h1>{{ repairment.serial_num || 'Unit without serial number' }}</h1><p>Status: {{ repairment.status }}</p></div><RouterLink class="button button--lime" :to="`/repairments/${repairment._id}/edit`">Edit repairment</RouterLink></div></header>
      <section class="detail-section"><dl class="record-grid"><div><dt>Field tests</dt><dd>{{ repairment.field_test_date?.map(formatDate).join(', ') || '—' }}</dd></div><div><dt>Repairers</dt><dd>{{ repairment.repairer?.join(', ') || '—' }}</dd></div></dl></section>
      <section class="detail-section"><span class="eyebrow">Spare parts</span><div v-if="repairment.spare_part?.length" class="updates-list"><article v-for="part in repairment.spare_part" :key="`${part.part}-${part.price}`"><p>{{ part.part }} · {{ part.price }}</p></article></div><p v-else class="muted">No spare parts recorded.</p></section>
      <section class="detail-section"><span class="eyebrow">Updates</span><div v-if="repairment.updates?.length" class="updates-list"><article v-for="update in repairment.updates" :key="update._id || update.createdAt"><p>{{ update.text }}</p><time :datetime="update.createdAt">{{ formatDate(update.createdAt) }}</time></article></div><p v-else class="muted">No updates recorded.</p></section>
    </template>
  </main>
</template>
