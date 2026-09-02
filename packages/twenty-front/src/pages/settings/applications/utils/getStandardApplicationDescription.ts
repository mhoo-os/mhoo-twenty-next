import { t } from '@lingui/core/macro';

type ApplicationDescriptionBrand = {
  productName?: string;
  documentationUrl?: string;
};

export const getStandardApplicationDescription = ({
  productName = 'Twenty',
  documentationUrl = 'https://twenty.com/developers/extend/apps/getting-started',
}: ApplicationDescriptionBrand = {}): string => t`The base data model every ${productName} workspace runs on.

#### What "foundation" means

Every ${productName} workspace starts with this set of objects. They define the shape of your CRM, including relationships, activity, and reporting. Everything else, including marketplace apps, AI agents, and custom objects, plugs into them.

#### Included objects
- **People & Companies**: contact and account records
- **Opportunities**: your sales pipeline
- **Notes & Tasks**: activity and follow-ups
- **Workflows & Dashboards**: automation and reporting

Remove this app and the rest of ${productName} has nothing to hang off.

#### Build your own app

Extend ${productName} with your own objects, fields, logic functions, or AI skills. Scaffold a new app in one command:

\`\`\`bash
npx create-twenty-app@latest my-twenty-app
\`\`\`

Then inside the folder:

\`\`\`bash
cd my-twenty-app
yarn twenty dev
\`\`\`

See the [${productName} documentation](${documentationUrl}) for the full walkthrough, including the \`defineApplication\` / \`defineEntity\` APIs.`;
