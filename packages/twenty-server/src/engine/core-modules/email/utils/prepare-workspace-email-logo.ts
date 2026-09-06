import { Logger } from '@nestjs/common';

import { FileFolder } from 'twenty-shared/types';

import { readInlineEmailImage } from 'src/engine/core-modules/email/utils/inline-email-image';
import { type FileService } from 'src/engine/core-modules/file/services/file.service';

const logger = new Logger('WorkspaceEmailLogo');

export const prepareWorkspaceEmailLogo = async (
  fileService: Pick<FileService, 'getFileStreamById'>,
  workspace: { id: string; logoFileId: string | null },
) => {
  if (!workspace.logoFileId) {
    return undefined;
  }

  try {
    const file = await fileService.getFileStreamById({
      fileId: workspace.logoFileId,
      workspaceId: workspace.id,
      allowedFileFolders: [FileFolder.CorePicture],
    });

    return file ? await readInlineEmailImage(file.stream) : undefined;
  } catch {
    // Images are optional: do not prevent an invitation or leak storage details.
    logger.warn('Optional workspace email logo unavailable; omitting image');

    return undefined;
  }
};
