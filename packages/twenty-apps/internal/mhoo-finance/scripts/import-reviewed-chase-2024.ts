import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { planChasePdfImport, type ChasePdfArtifact } from '../src/operator/chase-pdf-import';
import { writeChasePdfPlan, type GraphqlTransport } from '../src/operator/chase-pdf-graphql-writer';
import { assertPopplerPageCount, verifyReviewedChaseFacts } from './private-chase-import-verification';

const ACCOUNT_ID = '703eba2a-132e-4599-babd-2c61260ce586';
const REVIEWED = {
  '2021-08': { artifactId: 'f20b5d9b-6bef-4230-b2c5-98624047d0a6', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '6bbf5c70828196b5ac374aaf22e4f1f2f86ac8aca7679b0f2a0ca5ece4274822', rows: 6 },
  '2021-09': { artifactId: '90998dab-5e0d-49a4-802a-c7b32a29f317', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '0f2655aea084ad397b5c7254363be86b15c481d8e63f051bde426b40d503a949', rows: 27 },
  '2021-10': { artifactId: '4b2756d9-99ad-4421-b1e6-340f02a8876c', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'b99d6d84f2b536cb0673b71aecaa70a04ff8adfa19bf899f81f1c86167f0ccd5', rows: 52 },
  '2021-11': { artifactId: '6e969ae5-b363-42c2-8be9-9a0207955846', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '3d0af2edf8c24dafd3ec6d06be366785fb2d806ae785ce89c5f74d0034bbca91', rows: 24 },
  '2021-12': { artifactId: '8b70f1b8-bf68-49c2-b4b3-fc7ee4639396', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '04468cebf6f99cf33a7189cb30cdbf5debee24fa5b584d0e0809b66cf892e953', rows: 17 },
  '2022-01': { artifactId: 'bc52b124-caf6-4557-84f3-c437b9c850a9', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '085aef081d1290c185043fdb741cbcc2eedda5703df58378c335f3e08ce69850', rows: 51 },
  '2022-02': { artifactId: '2b2fbc18-8f31-4c23-9b3c-5fb97b9e2dab', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'addc8ab84def7755f39963d4b60c483e1f1db8374d383b28c9a8f77d6269cef6', rows: 76 },
  '2022-03': { artifactId: 'bee39a2b-9b01-432d-a1bd-7f12fb83a0a9', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'ab94cf13c8b5664da7f6c3780c1f7fada6d29aecbd436fc03271a1389ebdd5aa', rows: 79 },
  '2022-04': { artifactId: '539695ce-d5d5-4984-9099-949d2d3722a0', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '2e793374660f1ae9718c0ec8cab3f057781cf908d4c25eb72c1b67514dd0ee67', rows: 72 },
  '2022-05': { artifactId: '405c4b94-1ce3-4b5e-b69e-96ab6fddb47c', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '974ba59e08133e773ee8f422fdc93e467327f4d1f734c6d9e4513a58c5d647f4', rows: 73 },
  '2022-06': { artifactId: '2fc92689-244b-47a3-bb2d-bdc694e0a8e9', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'd1f3b5cc8036ca55191f1154d7cab45b94d724625af0748e6edbc5c5e2a1d093', rows: 78 },
  '2022-07': { artifactId: 'dc4b5612-d429-488b-8cea-29f6cfc30395', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '10a044c192cec506ac4d67624c405b1bdb7198b95a098d85a48533b2f328581f', rows: 55 },
  '2022-08': { artifactId: 'e86c96bc-a741-4e58-ba71-a1b35df4cbf5', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '388d6691eec55da697fe492457d197d60211cc7cdca5964f13cc41fd5dc76692', rows: 46 },
  '2022-09': { artifactId: '880e5310-c352-4491-b338-04ea6a88c2c0', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '2f3c505294e57e549a06f8acf1d9bd8f0b171d23d91dcb81522919a926cdae39', rows: 79 },
  '2022-10': { artifactId: '31e884ad-2885-48c4-906b-a796fc01b757', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '168099f10626cfe44ce25c4000304a88eaf0e1f276099eeda10b15c11142810b', rows: 86 },
  '2022-11': { artifactId: 'd336180a-5294-4bc6-adf3-3437e84c7726', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '3549623368543710b23d629d393f56d9e16a91b75557bc868ce6c7e1667c55bc', rows: 126 },
  '2022-12': { artifactId: 'e204d68a-f2f8-4bdd-a595-6b830695d921', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '2a0c116bf69d13971660280680d63517f7dfe880ecd924cf05f785f3e3f464ba', rows: 83 },
  '2023-01': { artifactId: 'ffa6d447-ecde-4614-bbaa-977297cbc718', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'cc46957608fd066f3a5c1255c8630f0267242bf6664cc843478a9d0cebe091f5', rows: 70 },
  '2023-02': { artifactId: 'ebb800a3-8ab0-4390-ad97-bf119f5a734d', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'd56efb9354b9e116ccb89e188da0d405e39f2a1ea60982243815aab834a82503', rows: 86 },
  '2023-03': { artifactId: '7c4ffd84-7149-42a8-a0c2-50f54cc62814', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '5248151d6bf6eba8df8c885aa866ca5191482b5447682a410403816f28897758', rows: 79 },
  '2023-04': { artifactId: '53ddfacc-5d5d-445c-8e9f-8b4faae3bab8', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'b4b307222e18589d4e1cd81d963bc3568261801a9bb1839bfbcd63041367ce5e', rows: 81 },
  '2023-05': { artifactId: 'e29bb2b5-a450-4393-9d3b-75a255494cf8', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'fd377af2b4371530c374e389ae036736744762db603249c437897dfaf5b71714', rows: 85 },
  '2023-06': { artifactId: '65c20bd9-358b-4a28-b46d-12eb91f35fe0', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '5ad2c4d12d51554c41c46f6adf7fd53db8fd9efb34aeb4d678b40ceb82326560', rows: 64 },
  '2023-07': { artifactId: '632cb4c3-43b2-4951-9513-c96b0ac484fc', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '201187ee1d14a1a267cc51add185a422e1fd76728f244dfddda0d20fc11445f6', rows: 66 },
  '2023-08': { artifactId: '765d9187-2243-4665-835e-5ea2a6ab11db', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'd0e2de3b8396ee62542b00d389804fa7e046d6215b804d369f3acd3f339f8cb1', rows: 74 },
  '2023-09': { artifactId: 'c36be15f-ae5e-4872-8f8f-429909c1c793', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '46eac1c46dbf5786077783e4366c06fb520c96f664c3d55a11dcc1a51778a35c', rows: 79 },
  '2023-10': { artifactId: '6f605884-4a49-481a-9630-ca28a79e8412', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'e60e7b599f2cc45ca91eed06d756117e13d106606b2c09c4555f3d7856f6820c', rows: 98 },
  '2023-11': { artifactId: '9d0c1b58-32bb-46b7-80a8-c1feb8ead96e', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '49800bb6b79c04cc8fb501c83f671177f0d512ef726d66b4d46391ab3e0ae966', rows: 82 },
  '2023-12': { artifactId: 'ddf9b43c-49a8-4d73-b550-5e31a8be0dc8', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'e18f89c79df899c121f9d8080827c098614a092aca58a753fb30cf4b74c6b1e1', rows: 68 },
  '2024-01': { artifactId: 'bfafbe7f-c960-4253-93f1-f0649b4d8bd1', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '4f6ebc55b18b6aadaa0e29a573664381b91632361989c5994263730154c426c1', rows: 101 },
  '2024-02': { artifactId: 'af644233-d650-402a-aa95-4386090c0652', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '98dc7158fbf26953513c5d588f45a5cae8c02ace87632ef3e3c94e54431dd940', rows: 87 },
  '2024-03': { artifactId: '0cc9cf74-057e-47bd-821b-418c9aae959b', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '775360a0993d858de3afeef6e6bc6860fd8f3b7f260aa3aa705a54ed535cb29b', rows: 85 },
  '2024-04': { artifactId: '853c87d3-472f-4693-8478-3a0063f25cb3', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'b215882851f02aae82c8bf0e6bde620964bce40df4c03931a956ca3d02430159', rows: 100 },
  '2024-05': { artifactId: 'bac3f63d-fc89-44ed-b224-9cf78670df1f', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '684bec3ddf4366d4b8606948bd27b758fee4216a63486a15591ea3ca4bc19069', rows: 70 },
  '2024-06': { artifactId: '94972562-9f1f-4ff8-99ec-f7ca820f79fb', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: '6071db25f19c1da2513606e302716ac7c32bfcbd21ee1e74b6b47f0da841c433', rows: 51 },
  '2024-07': { artifactId: '1cb3e05f-2262-4f1f-9ab6-660e45a4f7ab', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'a90b91f0c8286cf12c336bc49b1110eb32b5f5539ac72aa1b6087537855ea0a9', rows: 88 },
  '2024-08': { artifactId: 'fc979b03-2bf4-494b-a301-74b8e2534fcb', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'd4413cede361bf60e26e0a32c37e1c05c9a55440b93e195047e97718b62a4f4c', rows: 83 },
  '2024-09': { artifactId: '588b0563-f858-4155-9dd5-3df2ed5ad19b', approvalCommentId: 'ee780652-ba7f-4420-a642-c9492b1e655f', sha256: 'a7fce2d227999deb5141b9db8d4e47453827c4395935d76e16b109f63b84ad05', rows: 89 },
  '2024-10': { artifactId: 'aab03404-cfdd-4f54-be41-a4bc310962d4', approvalCommentId: '97c5e76a-68c5-44a2-8f98-647c811a11f0', sha256: 'c06d5173f5fcfb2de626dfc4a512c2aefffcb16c8db7c5c1e63b997af2f5e1f6', rows: 83 },
  '2024-11': { artifactId: 'b9b108f9-bb54-4e81-a5ac-9c8ec1ab077f', approvalCommentId: '8b224474-2d0d-424a-a2d8-344498a5b4f4', sha256: '8f3679b45e973f0707dd989b2eaf8539c2e27dcf17d36c6a03eb5cfc616ad9bf', rows: 79 },
  '2024-12': { artifactId: '5554c654-703e-4d83-8d81-ffec20dd1c9a', approvalCommentId: '8b224474-2d0d-424a-a2d8-344498a5b4f4', sha256: '0ccc33aa910e5694217c94ff60099963c11fe41c57b710d0b0c4f6fbfbd21a52', rows: 69 },
} as const;

const main = async () => {
  const [period, pdfPath, mode] = process.argv.slice(2);
  if (!period || !(period in REVIEWED) || !pdfPath || !['--dry-run', '--apply', '--verify', '--finalize'].includes(mode)) {
    throw new Error('Usage: import-reviewed-chase-2024.ts <reviewed 2021-08..2024-12 period> <exact PDF> --dry-run|--apply|--verify|--finalize');
  }
  const reviewed = REVIEWED[period as keyof typeof REVIEWED];
  const ARTIFACT_ID = reviewed.artifactId;
  const EXPECTED_HASH = reviewed.sha256;
  const APPROVAL_COMMENT_ID = reviewed.approvalCommentId;
  const bytes = await readFile(pdfPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== EXPECTED_HASH) throw new Error('PDF hash differs from reviewed source.');
  const extracted = spawnSync('pdftotext', ['-raw', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (extracted.status !== 0 || !extracted.stdout) throw new Error('Poppler extraction failed.');
  const metadata = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (metadata.status !== 0 || !metadata.stdout) throw new Error('PDF metadata read failed.');
  assertPopplerPageCount(metadata.stdout, extracted.stdout);

  const config = JSON.parse(await readFile('/Users/mhoooo/.twenty/config.json', 'utf8')) as { remotes: Record<string, { apiUrl: string; apiKey: string }> };
  const remote = config.remotes['finance-install-20260914'];
  if (remote?.apiUrl !== 'https://hass-kitchen.mhoo.app' || !remote.apiKey) throw new Error('Expected authenticated Hass Kitchen remote is unavailable.');
  const transport: GraphqlTransport = async ({ query, variables }) => {
    const response = await fetch(`${remote.apiUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${remote.apiKey}` },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error(`Twenty GraphQL HTTP ${response.status}`);
    return response.json();
  };
  const live = await transport({
    query: 'query ReviewedImportSource($artifactFilter: SourceArtifactFilterInput!, $accountFilter: FinancialAccountFilterInput!) { sourceArtifact(filter: $artifactFilter) { id artifactKey accountKey period sourceKind mimeType originalFileName byteLength contentHash acquiredAt acquiredBy originalFiles financialAccountId } financialAccount(filter: $accountFilter) { id sourceKind } }',
    variables: { artifactFilter: { id: { eq: ARTIFACT_ID } }, accountFilter: { id: { eq: ACCOUNT_ID } } },
  });
  if (live.errors?.length || !live.data?.sourceArtifact || !live.data?.financialAccount) throw new Error('Live source/account readback failed.');
  const artifact = live.data.sourceArtifact as ChasePdfArtifact;
  const account = live.data.financialAccount as { id: string; sourceKind: 'BANK' | 'CARD' };
  if (artifact.id !== ARTIFACT_ID || account.id !== ACCOUNT_ID || artifact.contentHash !== EXPECTED_HASH || artifact.period !== period) throw new Error('Live record identity differs from reviewed source.');
  const plan = planChasePdfImport({ artifact, financialAccount: account, pdfBytes: bytes, extractedText: extracted.stdout });
  if (plan.status !== 'COMPLETE' || plan.importedRows !== reviewed.rows || plan.duplicateRows !== 0 || plan.records.financeFacts.length !== reviewed.rows) throw new Error('Reviewed statement controls do not match exact row count.');
  if (mode === '--dry-run') {
    // eslint-disable-next-line no-console -- safe control summary only
    console.log(JSON.stringify({ status: plan.status, rows: plan.importedRows, sha256, write: false }));
    return;
  }
  // The coordinator verified this exact owner-attested MHO-227 Linear comment
  // and direct user direction before invoking --apply. This is a bounded
  // operator assertion, not a general client-contract or release verifier.
  let result: { receiptId: string; created: boolean };
  if (mode === '--apply') {
    const authority = { receiptId: APPROVAL_COMMENT_ID, scope: 'MHO-227:MHO-228:FINANCE_PDF_IMPORT' as const, sourceArtifactId: ARTIFACT_ID, financialAccountId: ACCOUNT_ID };
    result = await writeChasePdfPlan(transport, authority, async (candidate) => candidate.receiptId === APPROVAL_COMMENT_ID && candidate.sourceArtifactId === ARTIFACT_ID && candidate.financialAccountId === ACCOUNT_ID, { ...plan, artifact, account });
  } else {
    const receipt = await transport({ query: 'query ReviewedReceipt($filter: ImportReceiptFilterInput!) { importReceipts(filter: $filter) { edges { node { id receiptKey importedRows artifactId contentHash } } } }', variables: { filter: { receiptKey: { eq: plan.receiptKey } } } });
    const matched = receipt.data?.importReceipts?.edges?.[0]?.node;
    if (receipt.errors?.length || matched?.receiptKey !== plan.receiptKey || matched?.importedRows !== reviewed.rows || matched?.artifactId !== ARTIFACT_ID || matched?.contentHash !== EXPECTED_HASH) throw new Error('Existing exact import receipt is required before finalization.');
    const verifiedRows = await verifyReviewedChaseFacts(transport, {
      artifactId: ARTIFACT_ID,
      accountId: ACCOUNT_ID,
      facts: plan.records.financeFacts,
    });
    if (verifiedRows !== reviewed.rows) throw new Error('Exact reviewed Finance fact count differs.');
    result = { receiptId: matched.id, created: false };
  }
  if (mode === '--verify') {
    // eslint-disable-next-line no-console -- safe control summary only
    console.log(JSON.stringify({ status: 'EXACT_READBACK_VERIFIED', rows: plan.importedRows, receiptId: result.receiptId, write: false }));
    return;
  }
  const baseControls = plan.records.sourceArtifacts[0]?.statementControls;
  if (!baseControls) throw new Error('Reconciled statement controls are missing.');
  const exactMinor = (value: unknown) => {
    if (typeof value !== 'string' || !/^-?(0|[1-9]\d*)\.\d{2}$/.test(value)) throw new Error('Statement fact amount is not exact cents.');
    const negative = value.startsWith('-');
    const [whole, fraction] = (negative ? value.slice(1) : value).split('.');
    const parsed = BigInt(whole) * 100n + BigInt(fraction);
    return negative ? -parsed : parsed;
  };
  const signedAmounts = plan.records.financeFacts.map((fact) => exactMinor(fact.sourceAmount));
  const moneyInMinor = signedAmounts.filter((value) => value > 0n).reduce((sum, value) => sum + value, 0n);
  const moneyOutMinor = -signedAmounts.filter((value) => value < 0n).reduce((sum, value) => sum + value, 0n);
  const parsedControls = JSON.parse(baseControls) as { openingBalanceMinor: number; closingBalanceMinor: number };
  if (BigInt(parsedControls.openingBalanceMinor) + moneyInMinor - moneyOutMinor !== BigInt(parsedControls.closingBalanceMinor)) throw new Error('Statement money totals do not reconcile.');
  // USD is an explicit operator review of the original Hass Chase US checking
  // statement, not an inference from a missing Workspace field.
  const controls = JSON.stringify({ ...parsedControls, openingBalanceMinor: String(parsedControls.openingBalanceMinor), closingBalanceMinor: String(parsedControls.closingBalanceMinor), moneyInMinor: moneyInMinor.toString(), moneyOutMinor: moneyOutMinor.toString(), currencyCode: 'USD', currencyBasis: 'operator-reviewed Hass Chase US checking PDF' });
  const updated = await transport({
    query: 'mutation MarkReviewedImported($id: UUID!, $data: SourceArtifactUpdateInput!) { updateSourceArtifact(id: $id, data: $data) { id status rowCount statementControls } }',
    variables: { id: ARTIFACT_ID, data: { status: 'IMPORTED', rowCount: reviewed.rows, statementControls: controls } },
  });
  const marked = updated.data?.updateSourceArtifact;
  if (updated.errors?.length || marked?.id !== ARTIFACT_ID || marked?.status !== 'IMPORTED' || marked?.rowCount !== reviewed.rows || marked?.statementControls !== controls) throw new Error('SourceArtifact import-status readback failed.');
  // eslint-disable-next-line no-console -- safe control summary only
  console.log(JSON.stringify({ status: 'READBACK_COMPLETE', rows: plan.importedRows, receiptId: result.receiptId, created: result.created }));
};

void main().catch((error: unknown) => {
  // Never include transport responses, credentials, or source row data in logs.
  // eslint-disable-next-line no-console -- bounded failure code
  console.error('REVIEWED_IMPORT_FAILED', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
