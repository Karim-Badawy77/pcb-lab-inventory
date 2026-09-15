<script setup>
import { RouterLink } from 'vue-router';
defineProps({ repairment: { type: Object, required: true } });
function statusLabel(status) { return String(status || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
</script>
<template>
  <RouterLink class="repairment-card" :class="`repairment-card--${repairment.status}`" :to="`/repairments/${repairment._id}`">
    <div class="repairment-card__content">
      <span class="repairment-card__eyebrow">Repair queue <span aria-hidden="true">•</span> Unit</span>
      <h3>{{ repairment.serial_num || 'Unit without serial number' }}</h3>
    </div>
    <span class="status-badge" :class="`status-badge--${repairment.status}`" data-testid="unit-status-badge">{{ statusLabel(repairment.status) }}</span>
    <span class="repairment-card__arrow" aria-hidden="true">↗</span>
  </RouterLink>
</template>
