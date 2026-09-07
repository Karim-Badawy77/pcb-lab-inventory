import { createRouter, createWebHistory } from 'vue-router';
import InventoryPage from './pages/InventoryPage.vue';
import CreateItemPage from './pages/CreateItemPage.vue';
import ItemDetailPage from './pages/ItemDetailPage.vue';
import RepairmentDetailPage from './pages/RepairmentDetailPage.vue';

export const routes = [
  { path: '/', redirect: '/items' },
  { path: '/items', component: InventoryPage },
  { path: '/items/new', component: CreateItemPage },
  { path: '/items/:id', component: ItemDetailPage },
  { path: '/repairments/:id', component: RepairmentDetailPage },
  { path: '/:pathMatch(.*)*', component: { template: '<main class="state-panel"><h1>Page not found</h1><a href="/items">Return to inventory</a></main>' } }
];

export default createRouter({ history: createWebHistory(), routes });
