import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganiserApplicationsService } from './organiser-applications.service';
import { OrganiserApplicationsController } from './organiser-applications.controller';
import { OrganiserApplication } from '../../database/entities/organiser-application.entity';
import { User } from '../../database/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganiserApplication, User]),
    NotificationsModule,
    CommonModule,
  ],
  controllers: [OrganiserApplicationsController],
  providers: [OrganiserApplicationsService],
  exports: [OrganiserApplicationsService],
})
export class OrganiserApplicationsModule {}



