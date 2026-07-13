import User from '../models/User.js';

export class UserRepository {
  async create({ userId, name }) {
    return User.create({ userId, name });
  }

  async findByUserId(userId) {
    return User.findOne({ userId });
  }

  async findByUserName(name) {
    return User.findOne({ name });
  }

  async updateName(userId, name) {
    return User.findOneAndUpdate({ userId }, { name }, { new: true });
  }

  async delete(userId) {
    return User.deleteOne({ userId });
  }
}

export const userRepository = new UserRepository();
