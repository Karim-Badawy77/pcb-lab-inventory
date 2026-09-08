<script setup>
import { RouterLink } from 'vue-router';
defineProps({ repairment: { type: Object, required: true } });
</script>
<template>
  <RouterLink class="repairment-card" :to="`/repairments/${repairment._id}`">
    <div><span class="eyebrow">Repairment</span><h3>{{ repairment.serial_num || 'Unit without serial number' }}</h3></div>
    <span class="status-chip">{{ repairment.status }}</span>
  </RouterLink>
</template>
