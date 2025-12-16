import { IndexedEntity } from "./core-utils";
import type { FeedItem } from "@shared/types";
import { MOCK_FEEDS } from "@shared/mock-data";
export class FeedEntity extends IndexedEntity<FeedItem> {
  static readonly entityName = "feed";
  static readonly indexName = "feeds";
  static readonly initialState: FeedItem = {
    id: "",
    name: "",
    type: "Traffic",
    status: "Offline",
    region: "",
    lastUpdate: new Date(0).toISOString(),
  };
  static seedData = MOCK_FEEDS;
}