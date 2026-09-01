<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const props = defineProps({ existingImages: { type: Array, default: () => [] }, error: { type: String, default: '' } });
const emit = defineEmits(['change']);
const files = ref([]);
const removedIds = ref([]);
const previews = ref([]);

const retainedImages = computed(() => props.existingImages.filter((image) => !removedIds.value.includes(image._id)));

function revokePreviews() {
  previews.value.forEach((preview) => URL.revokeObjectURL?.(preview.url));
}

function notify() {
  emit('change', { files: [...files.value], removeImageIds: [...removedIds.value], retainedImageCount: retainedImages.value.length });
}

function selectFiles(event) {
  revokePreviews();
  files.value = [...event.target.files];
  previews.value = files.value.map((file) => ({ file, url: URL.createObjectURL?.(file) || '' }));
  notify();
}

function removeNew(index) {
  const [preview] = previews.value.splice(index, 1);
  if (preview?.url) URL.revokeObjectURL?.(preview.url);
  files.value.splice(index, 1);
  notify();
}

function removeExisting(id) {
  removedIds.value.push(id);
  notify();
}

onBeforeUnmount(revokePreviews);
</script>

<template>
  <section class="image-picker" aria-labelledby="images-heading">
    <div class="section-heading">
      <div><span class="eyebrow">Visual record</span><h2 id="images-heading">Images</h2></div>
      <span>{{ retainedImages.length + files.length }} / 10</span>
    </div>
    <label class="upload-drop">
      <span class="upload-icon">＋</span>
      <strong>Add board photos</strong>
      <span>Use camera or choose JPEG, PNG, WebP</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple @change="selectFiles">
    </label>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <div v-if="retainedImages.length || previews.length" class="image-preview-grid">
      <figure v-for="image in retainedImages" :key="image._id" class="image-preview">
        <img :src="image.path" :alt="image.originalName || 'Existing item image'">
        <button type="button" aria-label="Remove existing image" @click="removeExisting(image._id)">×</button>
      </figure>
      <figure v-for="(preview, index) in previews" :key="`${preview.file.name}-${index}`" class="image-preview">
        <img :src="preview.url" :alt="`Preview of ${preview.file.name}`">
        <button type="button" :aria-label="`Remove ${preview.file.name}`" @click="removeNew(index)">×</button>
      </figure>
    </div>
  </section>
</template>
