<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import ItemForm from "@/features/item-form/ItemForm.vue";
import FeedbackMessage from "@/components/FeedbackMessage.vue";
import { itemToForm, toItemFormData } from "@/features/item-form/item-form";
import { apiRequest } from "@/lib/api";
const route = useRoute(),
    router = useRouter(),
    item = ref(null),
    error = ref(""),
    busy = ref(false);
onMounted(async () => {
    try {
        item.value = await apiRequest(`/api/items/${route.params.id}`);
    } catch (e) {
        error.value = e.message;
    }
});
async function save(payload) {
    busy.value = true;
    try {
        await apiRequest(`/api/items/${route.params.id}`, {
            method: "PATCH",
            body: toItemFormData(
                payload.form,
                payload.files,
                payload.removeImageIds,
            ),
        });
        await router.push(`/items/${route.params.id}`);
    } catch (e) {
        error.value = e.message;
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <main class="page editor-page">
        <header class="editor-hero">
            <RouterLink class="back-link" :to="`/items/${route.params.id}`"
                >← Item details</RouterLink
            ><span class="eyebrow eyebrow--light">Edit inventory record</span>
            <h1>Update this component.</h1>
        </header>
        <FeedbackMessage :message="error" /><ItemForm
            v-if="item"
            :initial-item="itemToForm(item)"
            :busy="busy"
            creation-mode
            submit-label="Update item"
            @submit="save"
        />
    </main>
</template>
