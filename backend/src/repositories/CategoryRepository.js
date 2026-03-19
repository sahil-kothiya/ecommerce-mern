import { BaseRepository } from "./BaseRepository.js";
import { Category } from "../models/Category.js";

export class CategoryRepository extends BaseRepository {
  constructor() {
    super(Category);
  }

  async findBySlug(slug) {
    return this.findOne({ slug });
  }

  async findRoots() {
    return this.find(
      { parent: null, isDeleted: { $ne: true } },
      { sort: { order: 1 } },
    );
  }

  async findChildren(parentId) {
    return this.find({ parent: parentId }, { sort: { order: 1 } });
  }

  async findActiveTree() {
    return this.find({ status: "active" }, { sort: { level: 1, order: 1 } });
  }
}
