<script setup>
import { RouterLink } from 'vue-router';
import { formatDate } from '@/lib/dates';
defineProps({ repairment: { type: Object, required: true } });
function latestDate(repairment) { return [...(repairment.field_test_date || []), repairment.updatedAt].filter(Boolean).sort().at(-1); }
</script>
<template>
  <RouterLink class="repairment-card" :to="`/repairments/${repairment._id}`">
    <div><span class="eyebrow">Repairment</span><h3>{{ repairment.serial_num || 'Unit without serial number' }}</h3></div>
    <span class="status-chip">{{ repairment.status }}</span>
    <dl><div><dt>Repairers</dt><dd>{{ repairment.repairer?.length || 0 }}</dd></div><div><dt>Spare parts</dt><dd>{{ repairment.spare_part?.length || 0 }}</dd></div><div><dt>Updated</dt><dd>{{ formatDate(latestDate(repairment)) }}</dd></div></dl>
  </RouterLink>
</template>
