<script setup>
import { computed, onMounted, ref } from "vue";

const props = defineProps({
    busy: { type: Boolean, default: false },
    error: { type: String, default: "" },
});
const emit = defineEmits(["confirm", "close"]);
const quantity = ref(1);
const input = ref(null);
const valid = computed(
    () =>
        Number.isInteger(Number(quantity.value)) && Number(quantity.value) > 0,
);

function onKeydown(event) {
    if (event.key === "Escape" && !props.busy) emit("close");
}

onMounted(() => input.value?.focus());
</script>

<template>
    <div
        class="dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-units-title"
        @keydown="onKeydown"
        @click.self="!busy && $emit('close')"
    >
        <section class="delete-dialog add-units-dialog">
            <span class="eyebrow">Inventory quantity</span>
            <h2 id="add-units-title">Add units</h2>
            <p>
                Enter how many units to add. The total and available quantities
                will both increase.
            </p>
            <label class="field" for="units-input">Number of units</label>
            <input
                ref="input"
                id="units-input"
                v-model.number="quantity"
                name="units"
                type="number"
                min="1"
                step="1"
                required
            />
            <p v-if="error" class="field-error" role="alert">{{ error }}</p>
            <div class="dialog-actions">
                <button
                    type="button"
                    class="button button--ghost"
                    :disabled="busy"
                    @click="$emit('close')"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    class="button button--primary"
                    data-testid="confirm-add-units"
                    :disabled="busy || !valid"
                    @click="$emit('confirm', Number(quantity))"
                >
                    {{ busy ? "Adding…" : "Add units" }}
                </button>
            </div>
        </section>
    </div>
</template>

<style scoped>
label {
    margin-bottom: 1rem;
}
</style>
