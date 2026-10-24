const User = require('../models/user.model');

class UserRepository {
  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  }

  async existsByEmail(email) {
    const count = await User.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }
}

module.exports = new UserRepository();
