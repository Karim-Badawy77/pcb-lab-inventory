<script setup>
import StatusBadge from '@/components/StatusBadge.vue';
import { formatLocation, primaryImage } from '@/lib/inventory';
defineProps({ item: { type: Object, required: true }, view: { type: String, default: 'grid' } });
</script>

<template>
  <RouterLink class="inventory-card" :class="{ 'inventory-row': view === 'list' }" :to="`/items/${item._id}`">
    <template v-if="view === 'list'">
      <span class="inventory-row__thumb">
        <img v-if="primaryImage(item)" :src="primaryImage(item)" :alt="`${item.name} board`">
        <span v-else class="pcb-placeholder" aria-label="No item image"><b>PCB</b></span>
      </span>
      <span class="inventory-row__content">
        <span class="part-number">{{ item.part_num }}</span>
        <span class="inventory-row__name">{{ item.name }}</span>
        <span class="inventory-row__location"><span aria-hidden="true">⌖</span> {{ formatLocation(item) }}</span>
      </span>
      <span class="inventory-row__meta">
        <StatusBadge :stored="item.stored" :under-repairment="item.under_repairment" />
        <span class="inventory-row__quantity" :aria-label="`${item.available_quantity ?? item.total_quantity ?? 1} available`">
          <strong>{{ item.available_quantity ?? item.total_quantity ?? 1 }}</strong> available
        </span>
      </span>
      <span class="inventory-row__arrow" aria-hidden="true">↗</span>
    </template>
    <template v-else>
    <div class="card-image">
      <img v-if="primaryImage(item)" :src="primaryImage(item)" :alt="`${item.name} board`">
      <div v-else class="pcb-placeholder" aria-label="No item image"><span></span><i></i><b>PCB</b></div>
      <StatusBadge :stored="item.stored" :under-repairment="item.under_repairment" />
      <span class="quantity-badge" :aria-label="`${item.available_quantity ?? item.total_quantity ?? 1} available`">
        {{ item.available_quantity ?? item.total_quantity ?? 1 }} available
      </span>
    </div>
    <div class="card-copy">
      <span class="part-number">{{ item.part_num }}</span>
      <h2>{{ item.name }}</h2>
      <p><span aria-hidden="true">⌖</span> {{ formatLocation(item) }}</p>
      <div class="card-tags"><span v-if="item.category">{{ item.category }}</span><span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag">#{{ tag }}</span></div>
      <span class="card-open">View record <b aria-hidden="true">↗</b></span>
    </div>
    </template>
  </RouterLink>
</template>
