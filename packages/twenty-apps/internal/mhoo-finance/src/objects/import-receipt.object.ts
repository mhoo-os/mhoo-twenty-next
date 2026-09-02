import {
  defineObject,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  IMPORT_RECEIPT_ARTIFACT_FIELD_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_ATTEMPTS_FIELD_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_DEDUPLICATED_ROWS_FIELD_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_HASH_FIELD_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_IMPORTED_ROWS_FIELD_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_OBJECT_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_REVISION_FIELD_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
  SOURCE_ARTIFACT_RECEIPTS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

enum ReceiptStatus {
  IMPORTED = 'IMPORTED',
  DUPLICATE = 'DUPLICATE',
}

export default defineObject({
  universalIdentifier: IMPORT_RECEIPT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'importReceipt',
  namePlural: 'importReceipts',
  labelSingular: 'Import receipt',
  labelPlural: 'Import receipts',
  description: 'Deterministic import attempt and duplicate-suppression evidence.',
  icon: 'IconReceipt',
  labelIdentifierFieldMetadataUniversalIdentifier:
    IMPORT_RECEIPT_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: IMPORT_RECEIPT_KEY_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'receiptKey',
      label: 'Receipt key',
      icon: 'IconKey',
    },
    {
      universalIdentifier: IMPORT_RECEIPT_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      icon: 'IconProgress',
      options: [
        { id: 'd9e1d2f3-a4b5-4678-9012-3456789abd01', value: ReceiptStatus.IMPORTED, label: 'Imported', color: 'green', position: 0 },
        { id: 'd9e1d2f3-a4b5-4678-9012-3456789abd02', value: ReceiptStatus.DUPLICATE, label: 'Duplicate', color: 'gray', position: 1 },
      ],
    },
    {
      universalIdentifier: IMPORT_RECEIPT_ATTEMPTS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'attempts',
      label: 'Attempts',
      icon: 'IconRefresh',
    },
    {
      universalIdentifier: IMPORT_RECEIPT_IMPORTED_ROWS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'importedRows',
      label: 'Imported rows',
      icon: 'IconTable',
    },
    {
      universalIdentifier: IMPORT_RECEIPT_DEDUPLICATED_ROWS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'deduplicatedRows',
      label: 'Deduplicated rows',
      icon: 'IconFilter',
    },
    {
      universalIdentifier: IMPORT_RECEIPT_REVISION_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'sourceRevision',
      label: 'Source revision',
      icon: 'IconVersions',
    },
    {
      universalIdentifier: IMPORT_RECEIPT_HASH_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'contentHash',
      label: 'Content hash',
      icon: 'IconHash',
    },
    {
      universalIdentifier: IMPORT_RECEIPT_ARTIFACT_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.RELATION,
      name: 'artifact',
      label: 'Source artifact',
      icon: 'IconFileDescription',
      isNullable: true,
      relationTargetObjectMetadataUniversalIdentifier:
        SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
      relationTargetFieldMetadataUniversalIdentifier:
        SOURCE_ARTIFACT_RECEIPTS_FIELD_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.SET_NULL,
        joinColumnName: 'artifactId',
      },
    },
  ],
});
