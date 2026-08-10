const objectIdString = (value) => {
  if (value === null || value === undefined) return null;
  // Populated documents wrap the ObjectId in `_id`, while a Mongoose
  // ObjectId exposes `_id` as a getter that returns itself. Avoid recursing on
  // that self-reference.
  if (typeof value === 'object' && value._id !== undefined && value._id !== value) {
    return objectIdString(value._id);
  }
  return String(value);
};

/** Works with either a raw ObjectId or the `{ _id, email }` shape from populate. */
const orderBelongsToUser = (orderUser, userId) => {
  const orderUserId = objectIdString(orderUser);
  const requesterId = objectIdString(userId);
  return Boolean(orderUserId && requesterId && orderUserId === requesterId);
};

module.exports = { objectIdString, orderBelongsToUser };
