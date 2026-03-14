import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { WorkspaceSettings } from '../../database/entities/workspace-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceSettings])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

