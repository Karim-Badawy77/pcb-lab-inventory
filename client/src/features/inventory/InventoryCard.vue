<script setup>
import StatusBadge from '@/components/StatusBadge.vue';
import { formatLocation, primaryImage } from '@/lib/inventory';
defineProps({ item: { type: Object, required: true } });
</script>

<template>
  <RouterLink class="inventory-card" :to="`/items/${item._id}`">
    <div class="card-image">
      <img v-if="primaryImage(item)" :src="primaryImage(item)" :alt="`${item.name} board`">
      <div v-else class="pcb-placeholder" aria-label="No item image"><span></span><i></i><b>PCB</b></div>
      <StatusBadge :stored="item.stored" />
    </div>
    <div class="card-copy">
      <span class="part-number">{{ item.part_num }}</span>
      <h2>{{ item.name }}</h2>
      <p><span aria-hidden="true">⌖</span> {{ formatLocation(item) }}</p>
      <div class="card-tags"><span v-if="item.category">{{ item.category }}</span><span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag">#{{ tag }}</span></div>
      <span class="card-open">View record <b aria-hidden="true">↗</b></span>
    </div>
  </RouterLink>
</template>
