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
            <span class="upload-icon" aria-hidden="true">＋</span>
            <div class="upload-actions">
                <strong>Add board photos</strong>
                <div class="upload-buttons">
                    <label class="btn btn-primary">
                        <span aria-hidden="true">📷</span>
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
                        <span aria-hidden="true">🖼️</span>
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
    align-items: center;
    gap: 16px;
    padding: 20px;
    border: 1px dashed var(--green-2, #245c3d);
    border-radius: 12px;
    background: color-mix(
        in srgb,
        var(--paper, #fffdf6) 88%,
        var(--lime, #d7f04b)
    );
    text-align: center;
    cursor: auto;
}
.upload-icon {
    font-size: 28px;
    line-height: 1;
    color: var(--green, #173f2b);
    flex: 0 0 36px;
}
.upload-actions {
    flex: 1 1 auto;
    min-width: 0;
}
.upload-actions > strong {
    display: block;
    font-size: 1.05rem;
}
.upload-buttons {
    display: flex;
    gap: 10px;
    margin: 14px 0 10px;
}
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 1 1 0;
    padding: 12px 14px;
    min-height: 48px;
    border-radius: 9px;
    background: var(--green, #173f2b);
    color: #fff;
    cursor: pointer;
    user-select: none;
    font-weight: 800;
    text-align: center;
}
.btn.secondary {
    background: #fff;
    color: var(--green, #173f2b);
    border: 1px solid var(--green-2, #245c3d);
    background: var(--paper, #fffdf6);
}
.btn:active {
    transform: translateY(1px);
}
.upload-hint {
    display: block;
    color: var(--muted, #68736a);
    font-size: 0.78rem;
}

/* Make buttons larger and stacked on small screens to avoid misclicks */
@media (max-width: 640px) {
    .upload-drop {
        align-items: stretch;
        flex-direction: column;
        padding: 18px 14px;
        gap: 10px;
    }
    .upload-icon {
        flex-basis: auto;
    }
    .upload-buttons {
        flex-direction: column;
        gap: 10px;
    }
    .btn {
        width: 100%;
        min-height: 54px;
        font-size: 1rem;
    }
}
</style>
