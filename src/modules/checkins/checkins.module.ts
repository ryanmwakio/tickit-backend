import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinsService } from './checkins.service';
import { CheckinsController } from './checkins.controller';
import { Checkin } from '../../database/entities/checkin.entity';
import { Ticket } from '../../database/entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Checkin, Ticket])],
  controllers: [CheckinsController],
  providers: [CheckinsService],
  exports: [CheckinsService],
})
export class CheckinsModule {}

