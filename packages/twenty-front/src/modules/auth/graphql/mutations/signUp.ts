import { gql } from '@apollo/client';

import {
  AUTH_TOKEN,
  AUTH_TOKEN_PAIR,
  AVAILABLE_WORKSPACE_FOR_AUTH_FRAGMENT,
  AVAILABLE_WORKSPACES_FOR_AUTH_FRAGMENT,
} from '../fragments/authFragments';

export const SIGN_UP = gql`
  mutation SignUp(
    $email: String!
    $password: String!
    $captchaToken: String
    $locale: String
    $verifyEmailRedirectPath: String
    $mhooInvitationToken: String
  ) {
    signUp(
      email: $email
      password: $password
      captchaToken: $captchaToken
      locale: $locale
      verifyEmailRedirectPath: $verifyEmailRedirectPath
      mhooInvitationToken: $mhooInvitationToken
    ) {
      availableWorkspaces {
        ...AvailableWorkspacesFragment
      }
      tokens {
        ...AuthTokenPairFragment
      }
    }
  }
  ${AUTH_TOKEN}
  ${AUTH_TOKEN_PAIR}
  ${AVAILABLE_WORKSPACE_FOR_AUTH_FRAGMENT}
  ${AVAILABLE_WORKSPACES_FOR_AUTH_FRAGMENT}
`;
