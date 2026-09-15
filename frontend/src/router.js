import { createRouter, createWebHistory } from 'vue-router';
import InventoryPage from './pages/InventoryPage.vue';
import CreateItemPage from './pages/CreateItemPage.vue';
import ItemDetailPage from './pages/ItemDetailPage.vue';
import RepairmentDetailPage from './pages/RepairmentDetailPage.vue';
import EditItemPage from './pages/EditItemPage.vue';
import AddRepairmentPage from './pages/AddRepairmentPage.vue';
import EditRepairmentPage from './pages/EditRepairmentPage.vue';

export const routes = [
  { path: '/', redirect: '/items' },
  { path: '/items', component: InventoryPage },
  { path: '/items/new', component: CreateItemPage },
  { path: '/items/:id/edit', component: EditItemPage },
  { path: '/items/:itemId/repairments/new', component: AddRepairmentPage },
  { path: '/items/:id', component: ItemDetailPage },
  { path: '/repairments/:id', component: RepairmentDetailPage },
  { path: '/repairments/:id/edit', component: EditRepairmentPage },
  { path: '/:pathMatch(.*)*', component: { template: '<main class="state-panel"><h1>Page not found</h1><a href="/items">Return to inventory</a></main>' } }
];

export default createRouter({ history: createWebHistory(), routes });
