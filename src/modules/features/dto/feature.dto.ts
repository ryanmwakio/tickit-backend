export class FeatureDto {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  pricingType: 'one_time' | 'per_ticket' | 'per_event' | 'per_month';
  pricingUnit?: string;
  popular?: boolean;
  required?: boolean;
  category: string;
}

export class FeatureCategoryDto {
  id: string;
  name: string;
  description: string;
  features: FeatureDto[];
}

