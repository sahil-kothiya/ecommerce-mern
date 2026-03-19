import { BaseRepository } from "./BaseRepository.js";
import { Banner } from "../models/Banner.js";

export class BannerRepository extends BaseRepository {
  constructor() {
    super(Banner);
  }

  async findActive() {
    return this.find({ isActive: true }, { sort: { order: 1, createdAt: -1 } });
  }

  async findByPosition(position) {
    return this.find({ isActive: true, position }, { sort: { order: 1 } });
  }
}
