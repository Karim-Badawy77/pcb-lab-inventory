<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

const props = defineProps({
    existingImages: { type: Array, default: () => [] },
    error: { type: String, default: "" },
});
const emit = defineEmits(["change"]);
const files = ref([]);
const removedIds = ref([]);
const previews = ref([]);

const retainedImages = computed(() =>
    props.existingImages.filter(
        (image) => !removedIds.value.includes(image._id),
    ),
);

function revokePreviews() {
    previews.value.forEach((preview) => URL.revokeObjectURL?.(preview.url));
}

function notify() {
    emit("change", {
        files: [...files.value],
        removeImageIds: [...removedIds.value],
        retainedImageCount: retainedImages.value.length,
    });
}

function selectFiles(event) {
    revokePreviews();
    files.value = [...event.target.files];
    previews.value = files.value.map((file) => ({
        file,
        url: URL.createObjectURL?.(file) || "",
    }));
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
            <div>
                <span class="eyebrow">Visual record</span>
                <h2 id="images-heading">Images</h2>
            </div>
            <span>{{ retainedImages.length + files.length }} / 10</span>
        </div>
        <div class="upload-drop">
            <span class="upload-icon">＋</span>
            <div class="upload-actions">
                <strong>Add board photos</strong>
                <div class="upload-buttons">
                    <label class="btn">
                        Take photo
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            multiple
                            @change="selectFiles"
                            style="display: none"
                        />
                    </label>
                    <label class="btn secondary">
                        Choose from gallery
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            @change="selectFiles"
                            style="display: none"
                        />
                    </label>
                </div>
                <span class="upload-hint"
                    >Use camera or choose from gallery (JPEG, PNG, WebP)</span
                >
            </div>
        </div>
        <p v-if="error" class="field-error" role="alert">{{ error }}</p>
        <div
            v-if="retainedImages.length || previews.length"
            class="image-preview-grid"
        >
            <figure
                v-for="image in retainedImages"
                :key="image._id"
                class="image-preview"
            >
                <img
                    :src="image.path"
                    :alt="image.originalName || 'Existing item image'"
                />
                <button
                    type="button"
                    aria-label="Remove existing image"
                    @click="removeExisting(image._id)"
                >
                    ×
                </button>
            </figure>
            <figure
                v-for="(preview, index) in previews"
                :key="`${preview.file.name}-${index}`"
                class="image-preview"
            >
                <img
                    :src="preview.url"
                    :alt="`Preview of ${preview.file.name}`"
                />
                <button
                    type="button"
                    :aria-label="`Remove ${preview.file.name}`"
                    @click="removeNew(index)"
                >
                    ×
                </button>
            </figure>
        </div>
    </section>
</template>

<style scoped>
.upload-drop {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border: 1px dashed var(--muted-600, #ccc);
    border-radius: 8px;
}
.upload-icon {
    font-size: 28px;
    line-height: 1;
    color: var(--brand-500, #0b74de);
    flex: 0 0 36px;
}
.upload-actions {
    flex: 1 1 auto;
}
.upload-buttons {
    display: flex;
    gap: 8px;
    margin: 8px 0;
}
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 14px;
    min-height: 44px;
    border-radius: 8px;
    background: var(--brand-500, #0b74de);
    color: #fff;
    cursor: pointer;
    user-select: none;
    font-weight: 600;
}
.btn.secondary {
    background: #fff;
    color: var(--muted-900, #111);
    border: 1px solid var(--muted-400, #ddd);
}
.btn:active {
    transform: translateY(1px);
}
.upload-hint {
    color: var(--muted-700, #666);
    font-size: 0.9rem;
}

/* Make buttons larger and stacked on small screens to avoid misclicks */
@media (max-width: 640px) {
    .upload-buttons {
        flex-direction: column;
    }
    .btn {
        width: 100%;
        padding: 14px 16px;
        min-height: 56px;
        font-size: 1rem;
    }
}
</style>
