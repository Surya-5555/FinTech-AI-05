import { IsString, IsNotEmpty, ValidateNested, IsEnum, IsDateString, IsOptional, MaxLength, Matches, IsObject, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, PaymentFailureReason, ConsentStatus } from '@rr/contracts';

export class MerchantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalReference!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  segment!: string;
}

export class ConsentsDto {
  @IsEnum(ConsentStatus)
  email!: string;

  @IsEnum(ConsentStatus)
  sms!: string;

  @IsEnum(ConsentStatus)
  voice!: string;
}

export class CustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalReference!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  maskedReference!: string;

  @ValidateNested()
  @Type(() => ConsentsDto)
  consents!: ConsentsDto;
}

export class AmountDto {
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'amountMinor must be a positive integer string' })
  amountMinor!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency!: string;
}


@ValidatorConstraint({ name: 'metadataValidator', async: false })
export class MetadataValidator implements ValidatorConstraintInterface {
  validate(metadata: any) {
    if (!metadata || typeof metadata !== 'object') return false;
    const keys = Object.keys(metadata);
    if (keys.length > 20) return false; // size limited
    for (const key of keys) {
      if (typeof key !== 'string' || key.length > 50) return false;
      const val = metadata[key];
      if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') return false;
      if (typeof val === 'string' && val.length > 200) return false;
    }
    return true;
  }
  defaultMessage() {
    return 'metadata must be a shallow object with max 20 keys, string keys under 50 chars, and scalar values (string under 200 chars, number, boolean)';
  }
}

export class IngestEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalEventId!: string;

  @ValidateNested()
  @Type(() => MerchantDto)
  merchant!: MerchantDto;

  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @IsEnum(EventType)
  eventType!: string;

  @IsDateString()
  occurredAt!: string;

  @ValidateNested()
  @Type(() => AmountDto)
  amount!: AmountDto;

  @IsOptional()
  @IsEnum(PaymentFailureReason)
  failureReason?: string;

  @IsOptional()
  @IsObject()
  @Validate(MetadataValidator)
  metadata?: Record<string, string | number | boolean>;
}
