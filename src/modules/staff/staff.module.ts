import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from '../../database/entities/staff.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { User } from '../../database/entities/user.entity';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, Organiser, User])],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}

