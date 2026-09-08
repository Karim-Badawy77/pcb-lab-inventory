<script setup>
import { computed } from 'vue';
import { formatDate } from '@/lib/dates';

const props = defineProps({ history: { type: Array, default: () => [] } });
const rows = computed(() => [...props.history].sort((left, right) => new Date(left.date) - new Date(right.date)));

function valueLabel(value) {
  if (value === null || value === undefined || value === '') return 'None';
  if (typeof value === 'object') {
    if (['warehouse', 'section', 'pack'].some((key) => key in value)) return [value.warehouse, value.section, value.pack].filter(Boolean).join(' / ') || 'None';
    if (Array.isArray(value)) return value.length ? value.map(valueLabel).join(', ') : 'None';
    return Object.entries(value).filter(([key]) => !['_id', '__v'].includes(key)).map(([key, entry]) => `${key}: ${valueLabel(entry)}`).join('; ') || 'None';
  }
  return String(value);
}

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
  return 'Item updated';
}
</script>

<template>
  <ol v-if="rows.length" class="history-list">
    <li v-for="row in rows" :key="row._id || row.date">
      <span class="history-dot"></span>
      <div><time :datetime="row.date">{{ formatDate(row.date) }}</time><h3>{{ title(row) }}</h3><template v-if="row.fields?.length"><p v-for="field in row.fields" :key="`${row._id}-${field.field_name}`"><strong>{{ field.field_name.replaceAll('_', ' ') }}</strong>: {{ valueLabel(field.from) }} <span aria-hidden="true">→</span> {{ valueLabel(field.to) }}</p></template><p v-else-if="!row.new_item">{{ stateLabel(row.from) }} <span aria-hidden="true">→</span> {{ stateLabel(row.to) }}</p><p v-else>{{ stateLabel(row.to) }}</p></div>
    </li>
  </ol>
  <p v-else class="muted">No transaction history recorded.</p>
</template>
