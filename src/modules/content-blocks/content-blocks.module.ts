import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentBlocksService } from './content-blocks.service';
import { ContentBlocksController } from './content-blocks.controller';
import { ContentBlock } from '../../database/entities/content-block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContentBlock])],
  controllers: [ContentBlocksController],
  providers: [ContentBlocksService],
  exports: [ContentBlocksService],
})
export class ContentBlocksModule {}

