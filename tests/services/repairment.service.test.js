const mongoose = require('mongoose');
const Repairment = require('../../src/models/repairment.model');
const Item = require('../../src/models/item.model');
const History = require('../../src/models/history.model');
const { updateRepairment } = require('../../src/services/repairment.service');

afterEach(() => jest.restoreAllMocks());

test('editing a repairment serial number saves the new value and records its history', async () => {
  const repairment = new Repairment({ item_id: new mongoose.Types.ObjectId(), status: 'repairing', serial_num: 'SN-OLD' });
  const save = jest.spyOn(repairment, 'save').mockResolvedValue(repairment);
  jest.spyOn(mongoose.connection, 'transaction').mockImplementation((operation) => operation({}));
  jest.spyOn(Repairment, 'findOne').mockReturnValue({ session: async () => repairment });
  jest.spyOn(Item, 'updateOne').mockResolvedValue({});
  const createHistory = jest.spyOn(History, 'create').mockResolvedValue([]);

  const updated = await updateRepairment(String(repairment._id), { serial_num: 'SN-NEW' });

  expect(updated.serial_num).toBe('SN-NEW');
  expect(save).toHaveBeenCalled();
  expect(createHistory.mock.calls[0][0][0].fields).toContainEqual({ field_name: 'serial_num', from: 'SN-OLD', to: 'SN-NEW' });
});
