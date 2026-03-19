import { BaseRepository } from "./BaseRepository.js";
import { VariantType } from "../models/VariantType.js";

export class VariantTypeRepository extends BaseRepository {
  constructor() {
    super(VariantType);
  }

  async findByName(name) {
    return this.findOne({ name: String(name).trim() });
  }

  async findAllWithOptions() {
    return this.find({}, { populate: "options", sort: { name: 1 } });
  }
}
