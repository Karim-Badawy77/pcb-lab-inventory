<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import FeedbackMessage from '@/components/FeedbackMessage.vue';

const props = defineProps({ item: { type: Object, required: true }, busy: Boolean, error: { type: String, default: '' } });
const emit = defineEmits(['confirm', 'close']);
const typedName = ref('');
const dialog = ref(null);
const input = ref(null);
const matches = computed(() => typedName.value === props.item.name);

function close() {
  if (!props.busy) emit('close');
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab') return;
  const controls = [...dialog.value.querySelectorAll('button:not([disabled]), input:not([disabled])')];
  if (!controls.length) return;
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

onMounted(async () => { await nextTick(); input.value?.focus(); });
</script>

<template>
  <div ref="dialog" class="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-title" @keydown="onKeydown" @click.self="close">
    <section class="delete-dialog">
      <span class="dialog-icon" aria-hidden="true">!</span>
      <span class="eyebrow eyebrow--danger">Permanent action</span>
      <h2 id="delete-title">Delete this item?</h2>
      <p><strong>{{ item.name }}</strong> ({{ item.part_num }}) will disappear from active inventory. Its history remains recorded.</p>
      <FeedbackMessage :message="error" />
      <label class="field"><span>Type “{{ item.name }}” to confirm</span><input ref="input" v-model="typedName" name="confirm_name" autocomplete="off" :disabled="busy"></label>
      <div class="dialog-actions">
        <button type="button" class="button button--ghost" :disabled="busy" @click="close">Cancel</button>
        <button type="button" class="button button--danger" data-testid="confirm-delete" :disabled="busy || !matches" @click="emit('confirm')">{{ busy ? 'Deleting…' : 'Delete item' }}</button>
      </div>
    </section>
  </div>
</template>
