import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthzService {
  healthCheck() {
    return { status: "ok" };
  }
}
