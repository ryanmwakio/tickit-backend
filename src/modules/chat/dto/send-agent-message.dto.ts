import { IsString, IsNotEmpty } from 'class-validator';

export class SendAgentMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

