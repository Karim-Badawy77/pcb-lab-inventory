export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_COUNT = 10;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function emptyItemForm() {
  return {
    name: '', part_num: '', stored: true,
    location: { warehouse: '', section: '', pack: '' },
    delivered_to: '', delivered_by: '', owner: '', category: '', description: '',
    tagsText: '', updates: [], newUpdateText: ''
  };
}

export function itemToForm(item = {}) {
  return {
    ...emptyItemForm(),
    name: item.name || '',
    part_num: item.part_num || '',
    stored: item.stored ?? true,
    location: {
      warehouse: item.location?.warehouse || '',
      section: item.location?.section || '',
      pack: item.location?.pack || ''
    },
    delivered_to: item.delivered_to || '',
    delivered_by: item.delivered_by || '',
    owner: item.owner || '',
    category: item.category || '',
    description: item.description || '',
    tagsText: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tagsText || ''),
    updates: (item.updates || []).map((update) => ({ ...update })),
    newUpdateText: item.newUpdateText || ''
  };
}

export function parseTags(tagsText) {
  return [...new Set(String(tagsText || '').split(',').map((tag) => tag.trim()).filter(Boolean))];
}

export function validateItemForm(form, files = [], retainedImageCount = 0) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Name is required';
  if (!form.part_num?.trim()) errors.part_num = 'Part number is required';
  if (form.stored) {
    if (!form.location?.warehouse?.trim()) errors['location.warehouse'] = 'Warehouse is required';
    if (!form.location?.section?.trim()) errors['location.section'] = 'Section is required';
    if (!form.location?.pack?.trim()) errors['location.pack'] = 'Pack is required';
  } else if (!form.delivered_to?.trim()) {
    errors.delivered_to = 'Delivered to is required';
  }

  if (retainedImageCount + files.length > MAX_IMAGE_COUNT) {
    errors.images = `A maximum of ${MAX_IMAGE_COUNT} images is allowed`;
  } else if (files.some((file) => !IMAGE_TYPES.includes(file.type))) {
    errors.images = 'Images must be JPEG, PNG, or WebP';
  } else if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
    errors.images = 'Each image must be 5 MB or smaller';
  }
  return errors;
}

function appendIfPresent(body, key, value) {
  const normalized = String(value ?? '').trim();
  if (normalized) body.append(key, normalized);
}

export function toItemFormData(form, files = [], removeImageIds = []) {
  const body = new FormData();
  body.append('name', form.name.trim());
  body.append('part_num', form.part_num.trim());
  body.append('stored', String(Boolean(form.stored)));
  appendIfPresent(body, 'owner', form.owner);
  appendIfPresent(body, 'category', form.category);
  appendIfPresent(body, 'description', form.description);
  appendIfPresent(body, 'delivered_by', form.delivered_by);

  if (form.stored) body.append('location', JSON.stringify(form.location));
  else appendIfPresent(body, 'delivered_to', form.delivered_to);

  const updates = (form.updates || []).map((update) => ({ ...update }));
  if (form.newUpdateText?.trim()) updates.push({ text: form.newUpdateText.trim() });
  body.append('tags', JSON.stringify(parseTags(form.tagsText)));
  body.append('updates', JSON.stringify(updates));
  body.append('removeImageIds', JSON.stringify(removeImageIds));
  files.forEach((file) => body.append('images', file));
  return body;
}
