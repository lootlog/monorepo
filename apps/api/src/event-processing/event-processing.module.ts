import { Module } from '@nestjs/common';
import { EventProcessingService } from 'src/event-processing/event-processing.service';

@Module({
  providers: [EventProcessingService],
  controllers: [],
  exports: [EventProcessingService],
})
export class EventProcessingModule {}
