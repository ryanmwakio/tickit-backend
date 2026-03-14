import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatMapsService } from './seat-maps.service';
import { SeatMapsController } from './seat-maps.controller';
import { SeatMap } from '../../database/entities/seat-map.entity';
import { Seat } from '../../database/entities/seat.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { Event } from '../../database/entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SeatMap, Seat, Organiser, Event])],
  controllers: [SeatMapsController],
  providers: [SeatMapsService],
  exports: [SeatMapsService],
})
export class SeatMapsModule {}

