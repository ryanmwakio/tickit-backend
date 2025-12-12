import { Controller, Get } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { FeatureCategoryDto } from './dto/feature.dto';

@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  findAll(): FeatureCategoryDto[] {
    return this.featuresService.findAll();
  }
}

