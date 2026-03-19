import mongoose from "mongoose";
import { BaseRepository } from "./BaseRepository.js";
import { Order } from "../models/Order.js";
import { AppError } from "../utils/AppError.js";

export class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  async findByUser(userId, options = {}) {
    return this.findAll({ filter: { user: userId }, ...options });
  }

  async findByOrderNumber(orderNumber) {
    return this.findOne({ orderNumber });
  }

  async findByIdempotencyKey(key) {
    return this.findOne({ idempotencyKey: key });
  }

  async findByIdAndUser(orderId, userId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError("Invalid order ID", 400);
    }
    return this.findOne({ _id: orderId, user: userId });
  }

  async updateStatus(orderId, status, extra = {}) {
    return this.updateByIdOrFail(orderId, { status, ...extra });
  }

  async addReturnRequest(orderId, request, session = null) {
    return this.findOneAndUpdate(
      { _id: orderId },
      { $push: { returnRequests: request } },
      { session },
    );
  }
}
