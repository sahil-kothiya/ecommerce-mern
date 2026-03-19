import mongoose from "mongoose";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll(options = {}) {
    const {
      filter = {},
      sort = { createdAt: -1 },
      page = 1,
      limit = 20,
      populate = "",
      select = "",
      lean = true,
    } = options;

    const skip = (page - 1) * limit;
    let query = this.model.find(filter);

    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    query = query.sort(sort);

    const [items, total] = await Promise.all([
      lean
        ? query.skip(skip).limit(limit).lean()
        : query.skip(skip).limit(limit),
      this.model.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async paginate(options = {}) {
    return this.findAll(options);
  }

  async findById(id, options = {}) {
    const { populate = "", select = "", lean = true } = options;

    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    let query = this.model.findById(id);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);

    return lean ? query.lean() : query;
  }

  async findByIdOrFail(id, options = {}) {
    const document = await this.findById(id, options);
    if (!document) throw new AppError(`${this.model.modelName} not found`, 404);
    return document;
  }

  async findOne(filter, options = {}) {
    const { populate = "", select = "", lean = true } = options;

    let query = this.model.findOne(filter);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);

    return lean ? query.lean() : query;
  }

  async findOneOrFail(filter, options = {}) {
    const document = await this.findOne(filter, options);
    if (!document) throw new AppError(`${this.model.modelName} not found`, 404);
    return document;
  }

  async find(filter = {}, options = {}) {
    const {
      populate = "",
      select = "",
      sort = {},
      skip = 0,
      limit = 0,
      lean = true,
    } = options;

    let query = this.model.find(filter);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    if (Object.keys(sort).length) query = query.sort(sort);
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return lean ? query.lean() : query;
  }

  async create(data, session = null) {
    const options = session ? { session } : {};
    const [document] = await this.model.create([data], options);
    logger.info(`${this.model.modelName} created: ${document._id}`);
    return document.toObject();
  }

  async updateById(id, data, options = {}) {
    const { session, runValidators = true } = options;
    const document = await this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators,
      ...(session && { session }),
    });
    if (document) logger.info(`${this.model.modelName} updated: ${id}`);
    return document ? document.toObject() : null;
  }

  async update(id, data, options = {}) {
    return this.updateById(id, data, options);
  }

  async updateByIdOrFail(id, data, options = {}) {
    const document = await this.updateById(id, data, options);
    if (!document) throw new AppError(`${this.model.modelName} not found`, 404);
    return document;
  }

  async updateOne(filter, data, options = {}) {
    const { session } = options;
    return this.model.updateOne(filter, data, session ? { session } : {});
  }

  async updateMany(filter, data, options = {}) {
    const { session } = options;
    return this.model.updateMany(filter, data, session ? { session } : {});
  }

  async findOneAndUpdate(filter, data, options = {}) {
    const { session, runValidators = true, upsert = false } = options;
    const document = await this.model.findOneAndUpdate(filter, data, {
      new: true,
      runValidators,
      upsert,
      ...(session && { session }),
    });
    return document ? document.toObject() : null;
  }

  async deleteById(id, options = {}) {
    const { session } = options;
    const document = await this.model.findByIdAndDelete(
      id,
      session ? { session } : {},
    );
    if (document) logger.info(`${this.model.modelName} deleted: ${id}`);
    return document ? document.toObject() : null;
  }

  async delete(id, options = {}) {
    return this.deleteById(id, options);
  }

  async deleteByIdOrFail(id, options = {}) {
    const document = await this.deleteById(id, options);
    if (!document) throw new AppError(`${this.model.modelName} not found`, 404);
    return document;
  }

  async deleteOne(filter, options = {}) {
    const { session } = options;
    return this.model.deleteOne(filter, session ? { session } : {});
  }

  async bulkCreate(dataArray, options = {}) {
    const { session, ordered = true } = options;
    const documents = await this.model.insertMany(dataArray, {
      ordered,
      runValidators: true,
      ...(session && { session }),
    });
    logger.info(
      `${this.model.modelName} bulk created: ${documents.length} items`,
    );
    return documents.map((doc) => (doc.toObject ? doc.toObject() : doc));
  }

  async softDelete(id, options = {}) {
    return this.updateById(
      id,
      { deletedAt: new Date(), isDeleted: true },
      options,
    );
  }

  async exists(filter) {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return this.model.aggregate(pipeline);
  }

  async startSession() {
    return this.model.db.startSession();
  }

  async transaction(operations) {
    const session = await this.startSession();
    session.startTransaction();
    try {
      const result = await operations(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      logger.error("Transaction failed:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
