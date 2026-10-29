<script setup>
import { RouterLink } from "vue-router";
defineProps({ repairment: { type: Object, required: true } });
function statusLabel(status) {
    return String(status || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
</script>
<template>
    <RouterLink
        class="repairment-card"
        :class="`repairment-card--${repairment.status}`"
        :to="`/repairments/${repairment._id}`"
    >
        <div class="repairment-card__content">
            <span class="repairment-card__eyebrow"
                >{{ repairment.golden ? "Golden" : "Repairment" }}
                <span aria-hidden="true">•</span> Unit</span
            >
            <h3>{{ repairment.serial_num || "Unit without serial number" }}</h3>
            <small v-if="repairment.owner" class="repairment-card__owner">Owner: {{ repairment.owner }}</small>
        </div>
        <span
            v-if="!(repairment.status === 'repairing' && (repairment.repaired || repairment.golden))"
            class="status-badge"
            :class="`status-badge--${repairment.status}`"
            data-testid="unit-status-badge"
            >{{ statusLabel(repairment.status) }}</span
        >
        <span v-if="repairment.repaired" class="status-badge status-badge--repaired" data-testid="repaired-badge">Repaired</span>
        <span v-if="repairment.golden" class="status-badge status-badge--golden" data-testid="golden-badge">Golden</span>
        <span class="repairment-card__arrow" aria-hidden="true">↗</span>
    </RouterLink>
</template>
