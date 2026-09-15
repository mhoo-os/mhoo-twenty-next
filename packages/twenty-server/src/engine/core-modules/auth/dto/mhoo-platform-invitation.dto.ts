import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MhooPlatformInvitationDTO {
  @Field()
  email: string;

  @Field(() => Date)
  expiresAt: Date;
}
