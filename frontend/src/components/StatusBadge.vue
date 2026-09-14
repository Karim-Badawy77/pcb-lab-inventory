<script setup>
defineProps({ stored: Boolean, underRepairment: Boolean });
</script>
<template><span class="status-badge" :class="underRepairment ? 'status-badge--repairing' : stored ? 'status-badge--stored' : 'status-badge--delivered'"><span aria-hidden="true"></span>{{ underRepairment ? 'Repairing' : stored ? 'Stored' : 'Delivered' }}</span></template>
