<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/items"><span class="brand-mark">PL</span><span><strong>PCB LAB</strong><small>Inventory</small></span></RouterLink>
      <nav aria-label="Primary navigation">
        <RouterLink to="/items">Browse</RouterLink>
        <RouterLink class="nav-add" to="/items/new">＋ <span>New item</span></RouterLink>
      </nav>
    </header>
    <RouterView />
    <footer class="site-footer"><span>PCB LAB / INVENTORY</span><span>Local system · Offline ready</span></footer>
  </div>
</template>
