import { ArgsType, Field } from '@nestjs/graphql';

import { IsEmail, IsNotEmpty } from 'class-validator';

@ArgsType()
export class MhooPlatformInvitationInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
