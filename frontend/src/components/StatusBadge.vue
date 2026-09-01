<script setup>
defineProps({ stored: Boolean });
</script>
<template><span class="status-badge" :class="stored ? 'status-badge--stored' : 'status-badge--delivered'"><span aria-hidden="true"></span>{{ stored ? 'Stored' : 'Delivered' }}</span></template>
