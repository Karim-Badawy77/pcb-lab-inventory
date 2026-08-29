const fs = require('fs/promises');

async function removeFiles(paths) {
  await Promise.all((paths || []).map(async (filePath) => {
    try { await fs.unlink(filePath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }));
}

module.exports = { removeFiles };
