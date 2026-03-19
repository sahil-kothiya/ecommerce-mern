import { BaseRepository } from "./BaseRepository.js";
import { VariantOption } from "../models/VariantOption.js";

export class VariantOptionRepository extends BaseRepository {
  constructor() {
    super(VariantOption);
  }

  async findByType(variantTypeId) {
    return this.find({ variantType: variantTypeId }, { sort: { value: 1 } });
  }

  async findByTypeAndValue(variantTypeId, value) {
    return this.findOne({
      variantType: variantTypeId,
      value: String(value).trim(),
    });
  }
}
