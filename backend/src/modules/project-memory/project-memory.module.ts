import { Module } from '@nestjs/common';
import { ProjectMemoryController } from './project-memory.controller';
import { ProjectMemoryService } from './project-memory.service';

@Module({
  controllers: [ProjectMemoryController],
  providers: [ProjectMemoryService],
  exports: [ProjectMemoryService],
})
export class ProjectMemoryModule {}
