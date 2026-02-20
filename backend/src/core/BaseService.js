import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export class BaseService {
    
    constructor(model) {
        this.model = model;
    }

async findAll(options = {}) {
        try {
            const {
                filter = {},
                sort = { createdAt: -1 },
                page = 1,
                limit = 20,
                populate = '',
                select = ''
            } = options;

            const skip = (page - 1) * limit;

                        let query = this.model.find(filter);

            if (select) query = query.select(select);
            if (populate) query = query.populate(populate);
            if (sort) query = query.sort(sort);

                        const [items, total] = await Promise.all([
                query.skip(skip).limit(limit).lean(),
                this.model.countDocuments(filter)
            ]);

            return {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('BaseService.findAll error:', error);
            throw error;
        }
    }

async findById(id, options = {}) {
        try {
            const { populate = '', select = '' } = options;

            let query = this.model.findById(id);

            if (select) query = query.select(select);
            if (populate) query = query.populate(populate);

            const document = await query.lean();
            return document;
        } catch (error) {
            logger.error(`BaseService.findById error for ID ${id}:`, error);
            throw error;
        }
    }

async findByIdOrFail(id, options = {}) {
        const document = await this.findById(id, options);
        
        if (!document) {
            throw new AppError(`${this.model.modelName} not found`, 404);
        }

        return document;
    }

async findOne(filter, options = {}) {
        try {
            const { populate = '', select = '' } = options;

            let query = this.model.findOne(filter);

            if (select) query = query.select(select);
            if (populate) query = query.populate(populate);

            return await query.lean();
        } catch (error) {
            logger.error('BaseService.findOne error:', error);
            throw error;
        }
    }

async create(data) {
        try {
            const document = await this.model.create(data);
            logger.info(`${this.model.modelName} created:`, document._id);
            return document.toObject();
        } catch (error) {
            logger.error('BaseService.create error:', error);
            throw error;
        }
    }

async update(id, data, options = { new: true, runValidators: true }) {
        try {
            const document = await this.model.findByIdAndUpdate(
                id,
                data,
                options
            );

            if (document) {
                logger.info(`${this.model.modelName} updated:`, id);
            }

            return document ? document.toObject() : null;
        } catch (error) {
            logger.error(`BaseService.update error for ID ${id}:`, error);
            throw error;
        }
    }

async updateOrFail(id, data) {
        const document = await this.update(id, data);
        
        if (!document) {
            throw new AppError(`${this.model.modelName} not found`, 404);
        }

        return document;
    }

async delete(id) {
        try {
            const document = await this.model.findByIdAndDelete(id);
            
            if (document) {
                logger.info(`${this.model.modelName} deleted:`, id);
            }

            return document ? document.toObject() : null;
        } catch (error) {
            logger.error(`BaseService.delete error for ID ${id}:`, error);
            throw error;
        }
    }

async deleteOrFail(id) {
        const document = await this.delete(id);
        
        if (!document) {
            throw new AppError(`${this.model.modelName} not found`, 404);
        }

        return document;
    }

async exists(id) {
        try {
            const count = await this.model.countDocuments({ _id: id });
            return count > 0;
        } catch (error) {
            logger.error(`BaseService.exists error for ID ${id}:`, error);
            return false;
        }
    }

async count(filter = {}) {
        try {
            return await this.model.countDocuments(filter);
        } catch (error) {
            logger.error('BaseService.count error:', error);
            throw error;
        }
    }

async softDelete(id) {
        return await this.update(id, { status: 'inactive' });
    }

async bulkCreate(dataArray) {
        try {
            const documents = await this.model.insertMany(dataArray);
            logger.info(`${this.model.modelName} bulk created: ${documents.length} items`);
            return documents.map(doc => doc.toObject());
        } catch (error) {
            logger.error('BaseService.bulkCreate error:', error);
            throw error;
        }
    }

async transaction(operations) {
        const session = await this.model.db.startSession();
        session.startTransaction();

        try {
            const result = await operations(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            logger.error('Transaction failed:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }
}
