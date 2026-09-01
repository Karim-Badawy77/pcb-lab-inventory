<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import FeedbackMessage from '@/components/FeedbackMessage.vue';
import InventoryCard from '@/features/inventory/InventoryCard.vue';
import { fetchAllItems } from '@/lib/api';
import { filterItems, uniqueFilterOptions } from '@/lib/inventory';

const items = ref([]);
const loading = ref(true);
const error = ref('');
const filtersOpen = ref(false);
const criteria = reactive({ query: '', status: 'all', category: '', warehouse: '', tag: '' });

const options = computed(() => uniqueFilterOptions(items.value));
const visibleItems = computed(() => filterItems(items.value, criteria));
const filtersActive = computed(() => criteria.category || criteria.warehouse || criteria.tag);

async function loadItems() {
  loading.value = true;
  error.value = '';
  try { items.value = await fetchAllItems(); }
  catch (loadError) { error.value = loadError.message; }
  finally { loading.value = false; }
}

function clearFilters() {
  Object.assign(criteria, { query: '', status: 'all', category: '', warehouse: '', tag: '' });
}

onMounted(loadItems);
</script>

<template>
  <main class="page inventory-page">
    <header class="page-hero page-hero--inventory">
      <div><span class="eyebrow eyebrow--light">Inventory index</span><h1>Find a board.</h1><p>{{ items.length }} active inventory item{{ items.length === 1 ? '' : 's' }}</p></div>
      <RouterLink class="button button--lime hero-add" to="/items/new"><span>＋</span> Add item</RouterLink>
    </header>

    <section class="browse-tools" aria-label="Inventory search and filters">
      <label class="search-box"><span aria-hidden="true">⌕</span><input v-model="criteria.query" aria-label="Search inventory" placeholder="Search name, part number, owner, tag…"></label>
      <div class="quick-filters" aria-label="Status filter">
        <button v-for="status in ['all', 'stored', 'delivered']" :key="status" type="button" :data-status="status" :class="{ active: criteria.status === status }" @click="criteria.status = status">{{ status }}</button>
        <button type="button" :class="{ active: filtersActive }" @click="filtersOpen = !filtersOpen">Filters <span aria-hidden="true">{{ filtersOpen ? '−' : '+' }}</span></button>
      </div>
      <div v-if="filtersOpen" class="advanced-filters">
        <label><span>Category</span><select v-model="criteria.category"><option value="">All categories</option><option v-for="value in options.categories" :key="value">{{ value }}</option></select></label>
        <label><span>Warehouse</span><select v-model="criteria.warehouse"><option value="">All warehouses</option><option v-for="value in options.warehouses" :key="value">{{ value }}</option></select></label>
        <label><span>Tag</span><select v-model="criteria.tag"><option value="">All tags</option><option v-for="value in options.tags" :key="value">{{ value }}</option></select></label>
        <button type="button" class="text-button" @click="clearFilters">Clear all</button>
      </div>
    </section>

    <FeedbackMessage v-if="error" :message="error" />
    <div v-if="error" class="state-panel"><button class="button button--primary" data-testid="retry-inventory" @click="loadItems">Try again</button></div>
    <div v-else-if="loading" class="inventory-grid" aria-label="Loading inventory">
      <div v-for="index in 4" :key="index" class="card-skeleton"><span></span><span></span></div>
    </div>
    <section v-else-if="visibleItems.length" aria-live="polite">
      <div class="results-row"><strong>{{ visibleItems.length }} result{{ visibleItems.length === 1 ? '' : 's' }}</strong><span>Newest first</span></div>
      <div class="inventory-grid"><InventoryCard v-for="item in visibleItems" :key="item._id" :item="item" /></div>
    </section>
    <section v-else class="state-panel state-panel--empty">
      <span class="empty-symbol">⌁</span>
      <h2>{{ items.length ? 'No items match' : 'No inventory yet' }}</h2>
      <p>{{ items.length ? 'Try another search or clear your filters.' : 'Catalog the first board to start the lab index.' }}</p>
      <button v-if="items.length" class="button button--ghost" @click="clearFilters">Clear filters</button>
      <RouterLink v-else class="button button--primary" to="/items/new">Add first item</RouterLink>
    </section>
  </main>
</template>
