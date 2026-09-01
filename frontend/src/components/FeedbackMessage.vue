<script setup>
defineProps({ message: { type: String, default: '' }, type: { type: String, default: 'error' } });
</script>

<template>
  <p v-if="message" class="feedback" :class="`feedback--${type}`" :role="type === 'error' ? 'alert' : 'status'">
    {{ message }}
  </p>
</template>
