<script setup>
defineProps({ unit: { type: Object, required: true }, index: { type: Number, required: true } });
const statuses = [
  ['repairing', 'Repairing'], ['awaiting_spare_part', 'Awaiting spare part'],
  ['repaired', 'Repaired'], ['unrepairable', 'Unrepairable']
];
</script>

<template>
  <article class="repairment-unit" data-testid="repairment-unit">
    <div class="unit-heading"><span class="eyebrow">Unit {{ index + 1 }}</span><h3>Repairment record</h3></div>
    <div class="field-grid">
      <label class="field"><span>Serial number</span><input v-model="unit.serial_num" name="serial_num"></label>
      <label class="field"><span>Status *</span><select v-model="unit.status" name="repairment_status"><option value="">Select status</option><option v-for="[value, label] in statuses" :key="value" :value="value">{{ label }}</option></select></label>
    </div>
    <div class="field-grid">
      <label class="field"><span>Field test dates <em>comma separated</em></span><input v-model="unit.field_test_date_text" placeholder="2026-09-07, 2026-09-08"></label>
      <label class="field"><span>Repairers <em>comma separated</em></span><input v-model="unit.repairer_text" placeholder="Name one, Name two"></label>
    </div>
    <label class="field"><span>Update note</span><textarea v-model="unit.update_text" rows="2"></textarea></label>
    <label class="field"><span>Spare parts <em>part:price, comma separated</em></span><input v-model="unit.spare_part_text" placeholder="R1:2.50, C4:1.20"></label>
  </article>
</template>
