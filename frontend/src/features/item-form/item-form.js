export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_COUNT = 10;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function emptyItemForm() {
  return {
    name: '', part_num: '', stored: true, under_repairment: false, organization: '', type: '', quantity: 1,
    serial_num: [], repairments: [],
    location: { warehouse: '', section: '', pack: '' },
    delivered_to: '', delivered_by: '', owner: '', description: '',
    tagsText: '', updates: [], newUpdateText: ''
  };
}

export function itemToForm(item = {}) {
  return {
    ...emptyItemForm(),
    name: item.name || '',
    part_num: item.part_num || '',
    stored: item.stored ?? true,
    under_repairment: item.under_repairment ?? false,
    organization: item.organization || '',
    type: item.type || '',
    quantity: item.quantity || 1,
    serial_num: Array.isArray(item.serial_num) ? [...item.serial_num] : [],
    repairments: Array.isArray(item.repairments) ? item.repairments.map((repairment) => ({ ...repairment })) : [],
    location: {
      warehouse: item.location?.warehouse || '',
      section: item.location?.section || '',
      pack: item.location?.pack || ''
    },
    delivered_to: item.delivered_to || '',
    delivered_by: item.delivered_by || '',
    owner: item.owner || '',
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
  if (form.under_repairment) {
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1) errors.quantity = 'Quantity must be a positive whole number';
    if ((form.repairments || []).length !== Number(form.quantity)) errors.repairments = 'Add one repairment record per unit';
    (form.repairments || []).forEach((unit, index) => {
      if (!['repaired', 'unrepairable', 'repairing', 'awaiting_spare_part'].includes(unit.status)) errors[`repairments.${index}.status`] = 'Select a repairment status';
    });
  } else if (form.stored) {
    if (!form.location?.warehouse?.trim()) errors['location.warehouse'] = 'Warehouse is required';
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
  body.append('under_repairment', String(Boolean(form.under_repairment)));
  body.append('quantity', String(Number(form.quantity) || 1));
  const serials = form.under_repairment
    ? (form.repairments || []).map((unit) => String(unit.serial_num || '').trim())
    : (form.serial_num || []);
  body.append('serial_num', JSON.stringify(serials));
  appendIfPresent(body, 'owner', form.owner);
  appendIfPresent(body, 'organization', form.organization);
  appendIfPresent(body, 'type', form.type);
  appendIfPresent(body, 'description', form.description);
  appendIfPresent(body, 'delivered_by', form.delivered_by);

  if (form.stored) body.append('location', JSON.stringify(form.location));
  else appendIfPresent(body, 'delivered_to', form.delivered_to);

  const updates = (form.updates || []).map((update) => ({ ...update }));
  if (form.newUpdateText?.trim()) updates.push({ text: form.newUpdateText.trim() });
  body.append('tags', JSON.stringify(parseTags(form.tagsText)));
  body.append('updates', JSON.stringify(updates));
  if (form.under_repairment) {
    const repairments = (form.repairments || []).map((unit) => ({
      serial_num: String(unit.serial_num || '').trim() || undefined,
      status: unit.status,
      field_test_date: String(unit.field_test_date_text || '').split(',').map((value) => value.trim()).filter(Boolean),
      repairer: String(unit.repairer_text || '').split(',').map((value) => value.trim()).filter(Boolean),
      spare_part: String(unit.spare_part_text || '').split(',').map((value) => value.trim()).filter(Boolean).map((entry) => {
        const [part, price] = entry.split(':');
        return { part: part.trim(), price: Number(price) };
      }),
      updates: unit.update_text?.trim() ? [{ text: unit.update_text.trim() }] : []
    }));
    body.set('repairments', JSON.stringify(repairments));
  }
  body.append('removeImageIds', JSON.stringify(removeImageIds));
  files.forEach((file) => body.append('images', file));
  return body;
}
