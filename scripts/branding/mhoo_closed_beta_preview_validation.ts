type AssertMhooClosedBetaPreviewArgs = Readonly<{
  name: string;
  html: string;
  requiredMarkers: readonly string[];
}>;

const UPSTREAM_RESIDUE = ['Twenty', 'twenty.com'] as const;

export const assertMhooClosedBetaPreview = ({
  name,
  html,
  requiredMarkers,
}: AssertMhooClosedBetaPreviewArgs): void => {
  const missingMarkers = requiredMarkers.filter(
    (marker) => !html.includes(marker),
  );
  const residue = UPSTREAM_RESIDUE.filter((marker) => html.includes(marker));

  if (missingMarkers.length === 0 && residue.length === 0) {
    return;
  }

  throw new Error(
    `Mhoo preview validation failed for ${name}: missing markers [${missingMarkers.join(
      ', ',
    )}], upstream residue [${residue.join(', ')}]`,
  );
};
