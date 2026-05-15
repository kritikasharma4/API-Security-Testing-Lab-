const { v4: uuidv4 } = require('uuid');

const users = new Map();

function createUser(name, email, passwordHash) {
  const id = uuidv4();
  users.set(email, { id, name, email, passwordHash });
  return { id, name, email };
}

function findUserByEmail(email) {
  return users.get(email) || null;
}

module.exports = { createUser, findUserByEmail };
