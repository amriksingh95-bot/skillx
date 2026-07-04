const clients = new Map(); // customerId -> array of res objects

/**
 * Register an active SSE response client connection.
 * @param {string} customerId 
 * @param {object} res - Express Response object
 */
function addClient(customerId, res) {
  if (!clients.has(customerId)) {
    clients.set(customerId, []);
  }
  clients.get(customerId).push(res);
}

/**
 * Remove an active SSE client connection.
 * @param {string} customerId 
 * @param {object} res - Express Response object
 */
function removeClient(customerId, res) {
  if (clients.has(customerId)) {
    const list = clients.get(customerId);
    const index = list.indexOf(res);
    if (index !== -1) {
      list.splice(index, 1);
    }
    if (list.length === 0) {
      clients.delete(customerId);
    }
  }
}

/**
 * Send a JSON notification to all active connections for a given customer.
 * @param {string} customerId 
 * @param {object} data - Object payload to serialize and send
 */
function sendNotification(customerId, data) {
  if (clients.has(customerId)) {
    const list = clients.get(customerId);
    list.forEach(res => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
    return true;
  }
  return false;
}

// Keep-alive heartbeat interval (every 20 seconds) to prevent connections from dropping
setInterval(() => {
  clients.forEach((list, customerId) => {
    list.forEach(res => {
      // Sending a comment line (starts with colon) as a heartbeat
      res.write(`:\n\n`);
    });
  });
}, 20000);

module.exports = {
  addClient,
  removeClient,
  sendNotification
};
