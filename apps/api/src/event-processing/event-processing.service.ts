import { Injectable } from '@nestjs/common';
import { ProcessedEvents } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';

@Injectable()
export class EventProcessingService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventById(eventId: string): Promise<ProcessedEvents> {
    return this.prisma.processedEvents.findFirst({
      where: { id: eventId },
    });
  }

  async setEventProcessed(eventId: string) {
    await this.prisma.processedEvents.create({ data: { id: eventId } });
  }
}
