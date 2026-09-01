import { createRouter, createWebHistory } from 'vue-router';
import InventoryPage from './pages/InventoryPage.vue';
import CreateItemPage from './pages/CreateItemPage.vue';

export const routes = [
  { path: '/', redirect: '/items' },
  { path: '/items', component: InventoryPage },
  { path: '/items/new', component: CreateItemPage },
  { path: '/items/:id', component: InventoryPage }
];

export default createRouter({ history: createWebHistory(), routes });
