import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier: '27e1bebd-b3f0-462a-acf5-352879f11c5d',
  nameSingular: 'cloverMerchantObservation',
  namePlural: 'cloverMerchantObservations',
  labelSingular: 'Clover merchant observation',
  labelPlural: 'Clover merchant observations',
  description:
    'Provider merchant identity observed by Clover. Not financial evidence or permission verification.',
  icon: 'IconBuildingStore',
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    '0dc5c361-162f-45a6-b6b9-73d18c42e445',
  fields: [
    {
      universalIdentifier: '110dddc0-93c2-49e1-85d9-dc191228922e',
      name: 'merchantId',
      label: 'merchantId',
      type: FieldType.TEXT,
      icon: 'IconInfoCircle',
    },
    {
      universalIdentifier: '0dc5c361-162f-45a6-b6b9-73d18c42e445',
      name: 'merchantName',
      label: 'merchantName',
      type: FieldType.TEXT,
      icon: 'IconInfoCircle',
    },
    {
      universalIdentifier: 'be05c86b-f02d-4766-834e-780a063a3d56',
      name: 'observedAt',
      label: 'observedAt',
      type: FieldType.DATE_TIME,
      icon: 'IconInfoCircle',
    },
    {
      universalIdentifier: '65ca0688-6cf2-4b2a-badf-bb4eb7fd421d',
      name: 'sourceRevision',
      label: 'sourceRevision',
      type: FieldType.TEXT,
      icon: 'IconInfoCircle',
    },
    {
      universalIdentifier: '793b9878-4e68-4fa6-bf07-071a0f5f60ff',
      name: 'sourcePath',
      label: 'sourcePath',
      type: FieldType.TEXT,
      icon: 'IconInfoCircle',
    },
    {
      universalIdentifier: '912435c4-a339-4041-a381-7789dbc97400',
      name: 'scopeVerification',
      label: 'scopeVerification',
      type: FieldType.TEXT,
      icon: 'IconInfoCircle',
    },
  ],
});
