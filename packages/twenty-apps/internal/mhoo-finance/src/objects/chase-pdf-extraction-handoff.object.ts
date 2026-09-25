import {
  defineObject,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  CHASE_PDF_EXTRACTION_BYTE_LENGTH_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_FILES_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_HASH_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_HANDOFF_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_HANDOFF_OBJECT_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_HANDOFFS_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_MIME_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_PAGE_COUNT_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_PROFILE_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_SOURCE_ARTIFACT_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_SOURCE_HASH_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_PDF_EXTRACTION_VERSION_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/chase-pdf-extraction-identifiers';
import { SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/**
 * Retained derived text for a PDF whose original native File remains on the
 * SourceArtifact. Operators create this record after Poppler `-raw` extraction;
 * import jobs only read and verify it. A text File is used because extraction
 * output is too large and too valuable to put in a job payload or KV cursor.
 */
export default defineObject({
  universalIdentifier: CHASE_PDF_EXTRACTION_HANDOFF_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'chasePdfExtraction',
  namePlural: 'chasePdfExtractions',
  labelSingular: 'Chase PDF extraction',
  labelPlural: 'Chase PDF extractions',
  description: 'Hash-bound Poppler text derived from a retained Chase checking PDF.',
  icon: 'IconFileAnalytics',
  labelIdentifierFieldMetadataUniversalIdentifier:
    CHASE_PDF_EXTRACTION_HANDOFF_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_HANDOFF_KEY_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'handoffKey',
      label: 'Handoff key',
      icon: 'IconKey',
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_SOURCE_ARTIFACT_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.RELATION,
      name: 'sourceArtifact',
      label: 'Source artifact',
      icon: 'IconFileDescription',
      isNullable: false,
      relationTargetObjectMetadataUniversalIdentifier:
        SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
      relationTargetFieldMetadataUniversalIdentifier:
        CHASE_PDF_EXTRACTION_HANDOFFS_FIELD_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.CASCADE,
        joinColumnName: 'sourceArtifactId',
      },
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_SOURCE_HASH_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'sourcePdfHash',
      label: 'Source PDF hash',
      icon: 'IconHash',
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_HASH_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'extractionHash',
      label: 'Extraction hash',
      icon: 'IconHash',
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_PROFILE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'parserProfile',
      label: 'Parser profile',
      icon: 'IconCode',
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_VERSION_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'parserVersion',
      label: 'Parser version',
      icon: 'IconVersions',
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_MIME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'extractionMimeType',
      label: 'Extraction MIME type',
      icon: 'IconFileType',
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_BYTE_LENGTH_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'textByteLength',
      label: 'Text byte length',
      icon: 'IconFileAnalytics',
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_PAGE_COUNT_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'pageCount',
      label: 'Page count',
      icon: 'IconFileDescription',
    },
    {
      universalIdentifier: CHASE_PDF_EXTRACTION_FILES_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.FILES,
      name: 'extractionFiles',
      label: 'Extraction text file',
      description: 'The retained Poppler-derived UTF-8 text used by the bounded parser.',
      icon: 'IconFileDescription',
      universalSettings: { maxNumberOfValues: 1 },
    },
  ],
});
