import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { AILocale } from '@rr/contracts';

export class DraftRequestDto {
  @IsString()
  channel!: string;

  @IsEnum(AILocale)
  @IsOptional()
  locale?: AILocale;

  @IsBoolean()
  @IsOptional()
  preferLLM?: boolean;
}
