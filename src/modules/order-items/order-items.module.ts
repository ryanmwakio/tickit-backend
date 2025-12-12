import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../../database/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem])],
  controllers: [],
  providers: [],
  exports: [],
})
export class OrderItemsModule {}

