import { createRouter, createWebHistory } from 'vue-router';
import InventoryPage from './pages/InventoryPage.vue';

export const routes = [
  { path: '/', redirect: '/items' },
  { path: '/items', component: InventoryPage },
  { path: '/items/new', component: InventoryPage },
  { path: '/items/:id', component: InventoryPage }
];

export default createRouter({ history: createWebHistory(), routes });
