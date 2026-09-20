<script setup>
import { computed, ref } from 'vue';
const props = defineProps({ modelValue: { type: String, default: '' }, suggestions: { type: Array, default: () => [] }, name: { type: String, required: true } });
const emit = defineEmits(['update:modelValue']); const open = ref(false);
const filtered = computed(() => props.suggestions.filter((value) => !props.modelValue || value.toLowerCase().includes(props.modelValue.toLowerCase())).slice(0, 8));
function choose(value) { emit('update:modelValue', value); open.value = false; }
</script>
<template><div class="autocomplete-field"><input :value="modelValue" :name="name" autocomplete="off" @input="emit('update:modelValue', $event.target.value)" @focus="open = true" @blur="open = false"><div v-if="open && filtered.length" class="autocomplete-options"><button v-for="value in filtered" :key="value" type="button" @mousedown.prevent="choose(value)">{{ value }}</button></div></div></template>
