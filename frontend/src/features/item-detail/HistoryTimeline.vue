<script setup>
import { computed } from 'vue';
import { formatDate } from '@/lib/dates';

const props = defineProps({ history: { type: Array, default: () => [] } });
const rows = computed(() => [...props.history].sort((left, right) => new Date(left.date) - new Date(right.date)));

function stateLabel(state) {
  if (state === 'deleted') return 'Deleted';
  if (typeof state === 'string') return state;
  if (!state) return 'None';
  return [state.warehouse, state.section, state.pack].filter(Boolean).join(' / ') || 'Unknown location';
}

function title(row) {
  if (row.new_item) return 'Added to inventory';
  if (row.to === 'deleted') return 'Item deleted';
  if (typeof row.to === 'string') return 'Delivered';
  return 'Storage location updated';
}
</script>

<template>
  <ol v-if="rows.length" class="history-list">
    <li v-for="row in rows" :key="row._id || row.date">
      <span class="history-dot"></span>
      <div><time :datetime="row.date">{{ formatDate(row.date) }}</time><h3>{{ title(row) }}</h3><p v-if="!row.new_item">{{ stateLabel(row.from) }} <span aria-hidden="true">→</span> {{ stateLabel(row.to) }}</p><p v-else>{{ stateLabel(row.to) }}</p></div>
    </li>
  </ol>
  <p v-else class="muted">No transaction history recorded.</p>
</template>
