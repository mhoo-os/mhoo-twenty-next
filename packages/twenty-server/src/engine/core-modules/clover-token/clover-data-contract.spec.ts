import { FlatObjectPermissionValidatorService } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/services/flat-object-permission-validator.service';
import { getObjectsPermissionsFromRolePermissionConfig } from 'src/engine/twenty-orm/utils/get-objects-permissions-from-role-permission-config.util';

// Actual native validator/permission merger; maps stand in for installed metadata.
// This is not an App installation or runtime middleware proof.
describe('Clover source records consumed by another App', () => {
  const validator = new FlatObjectPermissionValidatorService();
  const validate = (objectExists = true, roleOwner = 'finance') =>
    validator.validateFlatObjectPermissionCreation({
      flatEntityToValidate: {
        universalIdentifier: 'permission',
        applicationUniversalIdentifier: 'finance',
        roleUniversalIdentifier: 'reader',
        objectMetadataUniversalIdentifier: 'clover-observation',
        canReadObjectRecords: true,
        canUpdateObjectRecords: false,
      },
      buildOptions: { applicationUniversalIdentifier: 'finance' },
      optimisticFlatEntityMapsAndRelatedFlatEntityMaps: {
        flatObjectPermissionMaps: { byUniversalIdentifier: {} },
        flatRoleMaps: {
          byUniversalIdentifier: {
            reader: {
              universalIdentifier: 'reader',
              applicationUniversalIdentifier: roleOwner,
              isEditable: true,
            },
          },
        },
        flatObjectMetadataMaps: {
          byUniversalIdentifier: objectExists
            ? {
                'clover-observation': {
                  universalIdentifier: 'clover-observation',
                  applicationUniversalIdentifier: 'clover',
                },
              }
            : {},
        },
      },
    } as never);
  it('permits Finance-owned read permission referencing an installed Clover-owned object', () => {
    expect(validate().errors).toEqual([]);
  });
  it('rejects a missing Clover object instead of creating or substituting one', () => {
    expect(validate(false).errors.map((error) => error.code)).toContain(
      'OBJECT_METADATA_NOT_FOUND_PERMISSIONS',
    );
  });
  it('rejects Finance trying to modify the Clover role', () => {
    expect(
      validate(true, 'clover').errors.map((error) => error.code),
    ).toContain('ROLE_BELONGS_TO_ANOTHER_APPLICATION');
  });
  it('requires both caller and consumer read authority and never unions their write rights', () => {
    const readOnly = {
      rowLevelPermissionPredicates: [],
      restrictedFields: {},
      canReadObjectRecords: true,
      canUpdateObjectRecords: false,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    };
    const result = getObjectsPermissionsFromRolePermissionConfig({
      rolesPermissions: {
        user: { observation: { ...readOnly, canUpdateObjectRecords: true } },
        finance: { observation: readOnly },
      },
      rolePermissionConfig: { intersectionOf: ['user', 'finance'] },
    } as never);
    expect(result.observation.canReadObjectRecords).toBe(true);
    expect(result.observation.canUpdateObjectRecords).toBe(false);
    expect(
      getObjectsPermissionsFromRolePermissionConfig({
        rolesPermissions: { user: { observation: readOnly } },
        rolePermissionConfig: { intersectionOf: ['user', 'finance'] },
      } as never),
    ).toEqual({});
  });
});
