<script setup>
import { nextTick, ref } from 'vue';

const props = defineProps({ images: { type: Array, default: () => [] }, itemName: { type: String, default: 'Inventory item' } });
const activeIndex = ref(0);
const lightboxOpen = ref(false);
const opener = ref(null);
const closeButton = ref(null);

function show(index) { activeIndex.value = index; }
async function openLightbox(event) {
  opener.value = event.currentTarget;
  lightboxOpen.value = true;
  await nextTick();
  closeButton.value?.focus();
}
async function closeLightbox() {
  lightboxOpen.value = false;
  await nextTick();
  opener.value?.focus();
}
function onDialogKeydown(event) {
  if (event.key === 'Escape') closeLightbox();
}
</script>

<template>
  <section class="gallery" aria-label="Item images">
    <button v-if="images.length" class="gallery-main" data-testid="open-lightbox" type="button" aria-label="Open image full screen" @click="openLightbox">
      <img :src="images[activeIndex].path" :alt="`${itemName} — ${images[activeIndex].originalName || `image ${activeIndex + 1}`}`">
      <span>Expand ↗</span>
    </button>
    <div v-else class="gallery-main gallery-empty"><div class="pcb-placeholder"><b>PCB</b></div><span>No images recorded</span></div>
    <div v-if="images.length > 1" class="gallery-thumbs" aria-label="Choose image">
      <button v-for="(image, index) in images" :key="image._id" type="button" :class="{ active: index === activeIndex }" :aria-label="`Show image ${index + 1}`" @click="show(index)">
        <img :src="image.path" alt="">
      </button>
    </div>
    <Teleport to="body">
      <div v-if="lightboxOpen" class="lightbox" role="dialog" aria-modal="true" aria-label="Full-screen item image" tabindex="-1" @keydown="onDialogKeydown" @click.self="closeLightbox">
        <button ref="closeButton" type="button" class="lightbox-close" aria-label="Close full-screen image" @click="closeLightbox">×</button>
        <img :src="images[activeIndex].path" :alt="`${itemName} full-screen image`">
        <div class="lightbox-count">{{ activeIndex + 1 }} / {{ images.length }}</div>
      </div>
    </Teleport>
  </section>
</template>
