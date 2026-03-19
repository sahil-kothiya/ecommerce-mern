import { BaseRepository } from "./BaseRepository.js";
import { Brand } from "../models/Brand.js";

export class BrandRepository extends BaseRepository {
  constructor() {
    super(Brand);
  }

  async findBySlug(slug) {
    return this.findOne({ slug });
  }

  async findActive() {
    return this.find({ status: "active" }, { sort: { title: 1 } });
  }
}
