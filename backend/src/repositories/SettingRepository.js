import { BaseRepository } from "./BaseRepository.js";
import { Setting } from "../models/Setting.js";

export class SettingRepository extends BaseRepository {
  constructor() {
    super(Setting);
  }

  async findByKey(key) {
    return this.findOne({ key });
  }

  async upsertByKey(key, value) {
    return this.findOneAndUpdate({ key }, { key, value }, { upsert: true });
  }

  async getPublicSettings() {
    return this.find({ isPublic: true });
  }

  async getAllAsMap() {
    const settings = await this.find({});
    return settings.reduce((map, s) => {
      map[s.key] = s.value;
      return map;
    }, {});
  }
}
