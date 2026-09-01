<script setup>
import { computed, reactive, ref, watch } from 'vue';
import FeedbackMessage from '@/components/FeedbackMessage.vue';
import ImagePicker from './ImagePicker.vue';
import { itemToForm, validateItemForm } from './item-form';

const props = defineProps({
  initialItem: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Save item' }
});
const emit = defineEmits(['submit', 'dirty-change', 'cancel']);
const form = reactive(itemToForm(props.initialItem));
const errors = ref({});
const files = ref([]);
const removeImageIds = ref([]);
const retainedImageCount = ref(props.initialItem.images?.length || 0);
const ready = ref(false);

const errorSummary = computed(() => Object.values(errors.value));

watch(form, () => {
  if (ready.value) emit('dirty-change', true);
}, { deep: true });
queueMicrotask(() => { ready.value = true; });

function setStored(value) {
  form.stored = value;
  if (value) form.delivered_to = '';
}

function onImagesChange(payload) {
  files.value = payload.files;
  removeImageIds.value = payload.removeImageIds;
  retainedImageCount.value = payload.retainedImageCount;
  emit('dirty-change', true);
}

function submit() {
  errors.value = validateItemForm(form, files.value, retainedImageCount.value);
  if (Object.keys(errors.value).length) return;
  emit('submit', { form: itemToForm(form), files: [...files.value], removeImageIds: [...removeImageIds.value] });
}
</script>

<template>
  <form class="item-form" novalidate @submit.prevent="submit">
    <FeedbackMessage v-if="errorSummary.length" :message="`Check ${errorSummary.length} highlighted field${errorSummary.length === 1 ? '' : 's'}.`" />

    <section class="form-section">
      <span class="eyebrow">01 · Identity</span>
      <h2>What is this board?</h2>
      <div class="field-grid">
        <label class="field"><span>Name *</span><input v-model="form.name" name="name" autocomplete="off"><small v-if="errors.name">{{ errors.name }}</small></label>
        <label class="field"><span>Part number *</span><input v-model="form.part_num" name="part_num" autocomplete="off"><small v-if="errors.part_num">{{ errors.part_num }}</small></label>
      </div>
    </section>

    <section class="form-section">
      <span class="eyebrow">02 · State</span>
      <h2>Where is it now?</h2>
      <div class="segmented" role="radiogroup" aria-label="Inventory status">
        <label><input type="radio" name="state" value="stored" :checked="form.stored" @change="setStored(true)"><span>Stored</span></label>
        <label><input type="radio" name="state" value="delivered" :checked="!form.stored" @change="setStored(false)"><span>Delivered</span></label>
      </div>
      <div v-if="form.stored" class="field-grid field-grid--three">
        <label class="field"><span>Warehouse *</span><input v-model="form.location.warehouse" name="warehouse"><small v-if="errors['location.warehouse']">{{ errors['location.warehouse'] }}</small></label>
        <label class="field"><span>Section *</span><input v-model="form.location.section" name="section"><small v-if="errors['location.section']">{{ errors['location.section'] }}</small></label>
        <label class="field"><span>Pack *</span><input v-model="form.location.pack" name="pack"><small v-if="errors['location.pack']">{{ errors['location.pack'] }}</small></label>
      </div>
      <div v-else class="field-grid">
        <label class="field"><span>Delivered to *</span><input v-model="form.delivered_to" name="delivered_to"><small v-if="errors.delivered_to">{{ errors.delivered_to }}</small></label>
        <label class="field"><span>Delivered by</span><input v-model="form.delivered_by" name="delivered_by"></label>
      </div>
    </section>

    <section class="form-section">
      <span class="eyebrow">03 · Classification</span>
      <h2>Make it easy to find.</h2>
      <div class="field-grid">
        <label class="field"><span>Category</span><input v-model="form.category" name="category"></label>
        <label class="field"><span>Owner</span><input v-model="form.owner" name="owner"></label>
      </div>
      <label class="field"><span>Tags <em>comma separated</em></span><input v-model="form.tagsText" name="tags" placeholder="controller, tested, rev-b"></label>
      <label class="field"><span>Description</span><textarea v-model="form.description" name="description" rows="4"></textarea></label>
      <label class="field"><span>Add update note</span><textarea v-model="form.newUpdateText" name="new_update" rows="2"></textarea></label>
    </section>

    <ImagePicker :existing-images="initialItem.images || []" :error="errors.images" @change="onImagesChange" />

    <div class="form-actions">
      <button v-if="$attrs.onCancel" type="button" class="button button--ghost" :disabled="busy" @click="$emit('cancel')">Cancel</button>
      <button class="button button--primary" type="submit" :disabled="busy">{{ busy ? 'Saving…' : submitLabel }}</button>
    </div>
  </form>
</template>
