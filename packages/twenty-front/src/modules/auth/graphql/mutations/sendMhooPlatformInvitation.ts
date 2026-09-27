import { gql } from '@apollo/client';

export const SEND_MHOO_PLATFORM_INVITATION = gql`
  mutation SendMhooPlatformInvitation($email: String!) {
    sendMhooPlatformInvitation(email: $email) {
      email
      expiresAt
    }
  }
`;
