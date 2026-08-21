import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  policyVersion!: string;
}
