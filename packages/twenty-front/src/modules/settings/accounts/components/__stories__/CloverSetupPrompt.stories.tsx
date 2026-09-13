import {
  type Decorator,
  type Meta,
  type StoryObj,
} from '@storybook/react-vite';
import { fn } from 'storybook/test';

import {
  CLOVER_SETUP_MODAL_ID,
  CloverSetupPromptModal,
} from '@/settings/accounts/components/CloverSetupPrompt';
import { isModalOpenedComponentState } from '@/ui/layout/modal/states/isModalOpenedComponentState';
import { focusStackState } from '@/ui/utilities/focus/states/focusStackState';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { ComponentDecorator } from 'twenty-ui/testing';
import { RootDecorator } from '~/testing/decorators/RootDecorator';

const OpenModalDecorator: Decorator = (Story) => {
  jotaiStore.set(
    isModalOpenedComponentState.atomFamily({
      instanceId: CLOVER_SETUP_MODAL_ID,
    }),
    true,
  );
  jotaiStore.set(focusStackState.atom, [
    {
      focusId: CLOVER_SETUP_MODAL_ID,
      componentInstance: {
        componentType: FocusComponentType.MODAL,
        componentInstanceId: CLOVER_SETUP_MODAL_ID,
      },
      globalHotkeysConfig: {
        enableGlobalHotkeysWithModifiers: false,
        enableGlobalHotkeysConflictingWithKeyboard: false,
      },
    },
  ]);
  return <Story />;
};

const meta: Meta<typeof CloverSetupPromptModal> = {
  title: 'Settings/Accounts/CloverSetupPrompt',
  component: CloverSetupPromptModal,
  decorators: [OpenModalDecorator, RootDecorator, ComponentDecorator],
  parameters: { disableHotkeyInitialization: true },
};

export default meta;
type Story = StoryObj<typeof CloverSetupPromptModal>;

export const NeedsSetup: Story = {
  args: {
    connectionState: 'needsSetup',
    onConnect: fn(),
    onDismiss: fn(),
  },
};

export const ReconnectRequired: Story = {
  args: {
    connectionState: 'reconnectRequired',
    onConnect: fn(),
    onDismiss: fn(),
  },
};
